interface RecognizeOptions {
  language?: string;
  accent?: string;
}

export interface SpeechResult {
  text: string;
  raw?: unknown;
}

export async function startVoiceRecognition(
  onResult: (result: SpeechResult) => void,
  options: RecognizeOptions = {}
): Promise<void> {
  console.info('调用科大讯飞语音识别（stub）', options);
  // TODO: 集成 WebRTC / SDK，实现实时语音识别
  onResult({ text: '语音识别尚未集成，返回示例文本。' });
}
