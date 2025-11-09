interface RecognizeOptions {
  language?: string;
  accent?: string;
  dynamicCorrection?: boolean;
  vadEos?: number;
  sampleRate?: 8000 | 16000;
  resId?: string;
  onError?: (error: Error) => void;
}

export interface SpeechResult {
  text: string;
  raw?: unknown;
  isFinal?: boolean;
}

export interface VoiceRecognitionSession {
  stop: () => Promise<void>;
  stream: MediaStream;
  isActive: () => boolean;
}

const IFLYTEK_HOST = 'iat.xf-yun.com';
const IFLYTEK_PATH = '/v1';
const IFLYTEK_BASE_URL = `wss://${IFLYTEK_HOST}${IFLYTEK_PATH}`;
const DEFAULT_LANGUAGE = 'zh_cn';
const DEFAULT_ACCENT = 'mandarin';
const DEFAULT_SAMPLE_RATE = 16000;
const FRAME_SAMPLE_COUNT = 640; // 40ms @ 16kHz

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

interface IflytekCredentials {
  appId: string;
  apiKey: string;
  apiSecret: string;
}

interface PendingFrame {
  audio: string;
  status: 0 | 1 | 2;
}

interface IatSegment {
  sn: number;
  ls?: boolean;
  pgs?: 'apd' | 'rpl';
  rg?: [number, number];
  ws?: Array<{ cw?: Array<{ w?: string }> }>;
}

interface IatMessage {
  header?: {
    code?: number;
    message?: string;
    status?: number;
  };
  payload?: {
    result?: {
      text?: string;
      seq?: number;
      status?: number;
    };
  };
}

class PcmDownsampler {
  private readonly inputSampleRate: number;

  private readonly outputSampleRate: number;

  private buffer: Float32Array | null = null;

  constructor(inputSampleRate: number, outputSampleRate: number) {
    this.inputSampleRate = inputSampleRate;
    this.outputSampleRate = outputSampleRate;
  }

  process(chunk?: Float32Array): Float32Array {
    let input: Float32Array;
    if (this.buffer && this.buffer.length) {
      if (chunk && chunk.length) {
        input = new Float32Array(this.buffer.length + chunk.length);
        input.set(this.buffer);
        input.set(chunk, this.buffer.length);
        this.buffer = null;
      } else {
        input = this.buffer;
        this.buffer = null;
      }
    } else if (chunk && chunk.length) {
      input = chunk;
    } else {
      return new Float32Array(0);
    }

    if (this.inputSampleRate === this.outputSampleRate) {
      return input;
    }

    const ratio = this.inputSampleRate / this.outputSampleRate;
    const outputLength = Math.floor(input.length / ratio);
    if (outputLength <= 0) {
      this.buffer = input;
      return new Float32Array(0);
    }

    const result = new Float32Array(outputLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < outputLength) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
        accum += input[i];
        count += 1;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }

    this.buffer = offsetBuffer < input.length ? input.slice(offsetBuffer) : null;

    return result;
  }

  flush(): Float32Array {
    return this.process();
  }
}

class PcmChunker {
  private readonly chunkSize: number;

  private pending = new Float32Array(0);

  constructor(chunkSize: number) {
    this.chunkSize = chunkSize;
  }

  push(buffer: Float32Array): Int16Array[] {
    if (!buffer.length) {
      return [];
    }
    const combined = new Float32Array(this.pending.length + buffer.length);
    combined.set(this.pending);
    combined.set(buffer, this.pending.length);

    const chunks: Int16Array[] = [];
    let offset = 0;
    while (offset + this.chunkSize <= combined.length) {
      const slice = combined.slice(offset, offset + this.chunkSize);
      chunks.push(floatToInt16(slice));
      offset += this.chunkSize;
    }

    this.pending = offset < combined.length ? combined.slice(offset) : new Float32Array(0);
    return chunks;
  }

  flush(): Int16Array[] {
    if (!this.pending.length) {
      return [];
    }
    const chunk = floatToInt16(this.pending);
    this.pending = new Float32Array(0);
    return [chunk];
  }
}

function floatToInt16(buffer: Float32Array): Int16Array {
  const result = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, buffer[i]));
    result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return result;
}

function assertBrowserSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('语音识别仅支持浏览器环境使用。');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持麦克风采集。');
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前环境缺少 Web Crypto 支持，无法完成科大讯飞鉴权签名。');
  }
}

function readCredentials(): IflytekCredentials {
  const {
    VITE_IFLYTEK_APP_ID: appId,
    VITE_IFLYTEK_API_KEY: apiKey,
    VITE_IFLYTEK_API_SECRET: apiSecret,
  } = import.meta.env;
  if (!appId || !apiKey || !apiSecret) {
    throw new Error(
      '请在环境变量中配置 VITE_IFLYTEK_APP_ID、VITE_IFLYTEK_API_KEY、VITE_IFLYTEK_API_SECRET。',
    );
  }
  return { appId, apiKey, apiSecret };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function stringToBase64(value: string): string {
  return arrayBufferToBase64(textEncoder.encode(value).buffer);
}

function base64ToUtf8(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return textDecoder.decode(bytes);
}

function encodeAudioChunk(chunk: Int16Array): string {
  const view = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

function extractSegmentText(segment: IatSegment): string {
  if (!segment.ws) {
    return '';
  }
  return segment.ws.map(ws => ws.cw?.map(cw => cw.w ?? '').join('') ?? '').join('');
}

function toError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }
  return new Error(typeof err === 'string' ? err : JSON.stringify(err));
}

async function buildSignedUrl(apiKey: string, apiSecret: string): Promise<string> {
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${IFLYTEK_HOST}\ndate: ${date}\nGET ${IFLYTEK_PATH} HTTP/1.1`;
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureSha = await crypto.subtle.sign('HMAC', key, textEncoder.encode(signatureOrigin));
  const signature = arrayBufferToBase64(signatureSha);

  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = stringToBase64(authorizationOrigin);

  const params = new URLSearchParams({
    authorization,
    date,
    host: IFLYTEK_HOST,
  });

  return `${IFLYTEK_BASE_URL}?${params.toString()}`;
}

function createAudioContext(): AudioContext {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    throw new Error('当前浏览器不支持 Web Audio API。');
  }
  return new AudioContextCtor();
}

export async function startVoiceRecognition(
  onResult: (result: SpeechResult) => void,
  options: RecognizeOptions = {},
): Promise<VoiceRecognitionSession> {
  assertBrowserSupport();
  const credentials = readCredentials();
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;

  const audioContext = createAudioContext();
  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const downsampler = new PcmDownsampler(audioContext.sampleRate, sampleRate);
  const chunker = new PcmChunker(FRAME_SAMPLE_COUNT);

  await audioContext.resume().catch(() => undefined);

  const wsUrl = await buildSignedUrl(credentials.apiKey, credentials.apiSecret);
  const ws = new WebSocket(wsUrl);

  const sendQueue: PendingFrame[] = [];
  const segments = new Map<number, string>();

  let isStopped = false;
  let hasFirstFrame = false;
  let frameSeq = 0;
  let shouldCloseAfterFinal = false;
  let cleaned = false;

  const callError = (err: unknown) => {
    const error = toError(err);
    if (options.onError) {
      options.onError(error);
    } else if (import.meta.env.DEV) {
      console.error('[voiceService] 语音识别失败', error);
    }
  };

  const cleanup = async () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    try {
      processor.disconnect();
    } catch (_err) {
      if (import.meta.env.DEV) {
        console.warn('[voiceService] 断开音频处理节点失败', _err);
      }
    }
    try {
      source.disconnect();
    } catch (_err) {
      if (import.meta.env.DEV) {
        console.warn('[voiceService] 断开音频源失败', _err);
      }
    }
    mediaStream.getTracks().forEach(track => track.stop());
    await audioContext.close().catch(() => undefined);
  };

  const flushQueue = () => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    while (sendQueue.length) {
      const frame = sendQueue.shift()!;
      const header: Record<string, unknown> = {
        app_id: credentials.appId,
        status: frame.status,
      };
      if (options.resId) {
        header.res_id = options.resId;
      }

      const payload: Record<string, unknown> = {
        audio: {
          encoding: 'raw',
          sample_rate: sampleRate,
          channels: 1,
          bit_depth: 16,
          status: frame.status,
          seq: frameSeq + 1,
          audio: frame.audio,
        },
      };

      const message: Record<string, unknown> = { header, payload };

      if (!hasFirstFrame) {
        message.parameter = {
          iat: {
            domain: 'slm',
            language: options.language ?? DEFAULT_LANGUAGE,
            accent: options.accent ?? DEFAULT_ACCENT,
            eos: options.vadEos ?? 6000,
            ...(options.dynamicCorrection ? { dwa: 'wpgs' } : {}),
            result: {
              encoding: 'utf8',
              format: 'json',
              compress: 'raw',
            },
          },
        };
        hasFirstFrame = true;
      }

      ws.send(JSON.stringify(message));
      frameSeq += 1;

      if (frame.status === 2 && shouldCloseAfterFinal) {
        shouldCloseAfterFinal = false;
        ws.close(1000, 'voice recognition finished');
      }
    }
  };

  const enqueueAudio = (chunk: Int16Array) => {
    const status: 0 | 1 = hasFirstFrame ? 1 : 0;
    sendQueue.push({ audio: encodeAudioChunk(chunk), status });
    flushQueue();
  };

  const enqueueFinalFrame = () => {
    if (shouldCloseAfterFinal) {
      return;
    }
    shouldCloseAfterFinal = true;
    if (!hasFirstFrame) {
      sendQueue.push({ audio: '', status: 0 });
    }
    sendQueue.push({ audio: '', status: 2 });
    flushQueue();
  };

  const handleMessage = (event: MessageEvent) => {
    let message: IatMessage;
    try {
      message = JSON.parse(event.data as string);
    } catch (err) {
      callError(new Error('无法解析科大讯飞返回数据'));
      if (import.meta.env.DEV) {
        console.error('[voiceService] 无法解析识别消息', err, event.data);
      }
      return;
    }

    const code = message.header?.code ?? 0;
    if (code !== 0) {
      const msg = message.header?.message ?? '未知错误';
      callError(new Error(`科大讯飞语音识别失败(${code}): ${msg}`));
      void stop().catch(() => undefined);
      return;
    }

    const payload = message.payload?.result;
    if (!payload?.text) {
      return;
    }

    let segmentJson: IatSegment;
    try {
      segmentJson = JSON.parse(base64ToUtf8(payload.text));
    } catch (err) {
      callError(new Error('解析科大讯飞识别结果失败'));
      if (import.meta.env.DEV) {
        console.error('[voiceService] 解析识别结果失败', err, payload.text);
      }
      return;
    }

    if (segmentJson.pgs === 'rpl' && Array.isArray(segmentJson.rg) && segmentJson.rg.length === 2) {
      for (let sn = segmentJson.rg[0]; sn <= segmentJson.rg[1]; sn += 1) {
        segments.delete(sn);
      }
    }

    const text = extractSegmentText(segmentJson);
    segments.set(segmentJson.sn, text);

    const aggregated = Array.from(segments.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value)
      .join('');

    onResult({
      text: aggregated,
      raw: { message, segment: segmentJson },
      isFinal: Boolean(segmentJson.ls),
    });
  };

  const handleClose = async (event: CloseEvent) => {
    await cleanup();
    if (!isStopped && event.code !== 1000) {
      callError(
        new Error(`科大讯飞语音识别连接关闭(${event.code}): ${event.reason || '未知原因'}`),
      );
    }
  };

  const handleError = (_event: Event) => {
    callError(new Error('科大讯飞语音识别 WebSocket 发生错误'));
    void stop().catch(() => undefined);
  };

  ws.addEventListener('open', flushQueue);
  ws.addEventListener('message', handleMessage);
  ws.addEventListener('error', handleError);
  ws.addEventListener('close', handleClose);

  processor.onaudioprocess = event => {
    if (isStopped) {
      return;
    }
    const channelData = event.inputBuffer.getChannelData(0);
    const downsampled = downsampler.process(channelData);
    const chunks = chunker.push(downsampled);
    chunks.forEach(enqueueAudio);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  const stop = async () => {
    if (isStopped) {
      return;
    }
    isStopped = true;
    processor.onaudioprocess = null;

    const tail = downsampler.flush();
    const finalChunks = [...chunker.push(tail), ...chunker.flush()];
    finalChunks.forEach(enqueueAudio);
    enqueueFinalFrame();

    if (ws.readyState === WebSocket.OPEN) {
      flushQueue();
    } else if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener(
        'open',
        () => {
          flushQueue();
        },
        { once: true },
      );
    }

    await cleanup();
  };

  return {
    stop: async () => {
      await stop();
    },
    stream: mediaStream,
    isActive: () => !isStopped,
  };
}
