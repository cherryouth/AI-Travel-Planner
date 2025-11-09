import { createServer } from 'node:http';
import { createHash, createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { URL } from 'node:url';
import { config as loadEnv } from 'dotenv';

// Load environment variables (local overrides global)
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });

const PORT = Number.parseInt(process.env.HUNYUAN_PROXY_PORT ?? '8787', 10);

const SECRET_ID =
  process.env.HUNYUAN_T1_SECRET_ID?.trim() ?? process.env.VITE_HUNYUAN_T1_SECRET_ID?.trim();
const SECRET_KEY =
  process.env.HUNYUAN_T1_SECRET_KEY?.trim() ?? process.env.VITE_HUNYUAN_T1_SECRET_KEY?.trim();

const DEFAULT_ENDPOINT =
  process.env.HUNYUAN_T1_ENDPOINT?.trim() ??
  process.env.VITE_HUNYUAN_T1_ENDPOINT?.trim() ??
  'https://hunyuan.tencentcloudapi.com';

if (!SECRET_ID || !SECRET_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[hunyuan-proxy] Missing HUNYUAN_T1_SECRET_ID or HUNYUAN_T1_SECRET_KEY environment variable. Requests will fail until configured.');
}

const SERVICE = 'hunyuan';
const DEFAULT_ACTION = 'ChatCompletions';
const DEFAULT_VERSION = '2023-09-01';
const CONTENT_TYPE = 'application/json; charset=utf-8';
const SIGNED_HEADERS = 'content-type;host;x-tc-action';

function hashSha256(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function signString(secretKey, date, service, stringToSign) {
  const secretDate = createHmac('sha256', `TC3${secretKey}`).update(date, 'utf8').digest();
  const secretService = createHmac('sha256', secretDate).update(service, 'utf8').digest();
  const secretSigning = createHmac('sha256', secretService).update('tc3_request', 'utf8').digest();
  return createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');
}

function buildCanonicalRequest({ pathname, payload, host, action }) {
  const canonicalHeaders = [
    `content-type:${CONTENT_TYPE}`,
    `host:${host}`,
    `x-tc-action:${action.toLowerCase()}`,
  ].join('\n');

  return [
    'POST',
    pathname || '/',
    '',
    `${canonicalHeaders}\n`,
    SIGNED_HEADERS,
    hashSha256(payload),
  ].join('\n');
}

function createAuthorizationHeader({
  secretId,
  secretKey,
  service,
  host,
  pathname,
  payload,
  action,
  timestamp,
}) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalRequest = buildCanonicalRequest({ pathname, payload, host, action });
  const hashedCanonicalRequest = hashSha256(canonicalRequest);
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
  const signature = signString(secretKey, date, service, stringToSign);

  return `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${SIGNED_HEADERS}, Signature=${signature}`;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function forwardToHunyuan(bodyBuffer, res) {
  if (!SECRET_ID || !SECRET_KEY) {
    throw new Error(
      'Hunyuan 密钥未配置，请在服务器环境变量中设置 HUNYUAN_T1_SECRET_ID 与 HUNYUAN_T1_SECRET_KEY。',
    );
  }

  const requestData = bodyBuffer.length > 0 ? JSON.parse(bodyBuffer.toString('utf8')) : {};
  const requestBody = requestData?.body;
  if (!requestBody || typeof requestBody !== 'object') {
    throw new Error('请求体缺少 body 字段，无法构造混元调用。');
  }

  const streamEnabled = Boolean(requestBody.Stream);

  const endpoint =
    (typeof requestData?.endpoint === 'string' && requestData.endpoint.trim()) || DEFAULT_ENDPOINT;
  const endpointUrl = new URL(endpoint);
  const pathname = endpointUrl.pathname || '/';

  const action =
    (typeof requestData?.action === 'string' && requestData.action.trim()) || DEFAULT_ACTION;
  const version =
    (typeof requestData?.version === 'string' && requestData.version.trim()) || DEFAULT_VERSION;
  const region =
    typeof requestData?.region === 'string' && requestData.region.trim()
      ? requestData.region.trim()
      : undefined;

  const payload = JSON.stringify(requestBody);
  const timestamp = Math.floor(Date.now() / 1000);
  const authorization = createAuthorizationHeader({
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
    service: SERVICE,
    host: endpointUrl.host,
    pathname,
    payload,
    action,
    timestamp,
  });

  const headers = {
    'Content-Type': CONTENT_TYPE,
    Authorization: authorization,
    'X-TC-Action': action,
    'X-TC-Version': version,
    'X-TC-Timestamp': String(timestamp),
  };
  if (region) {
    headers['X-TC-Region'] = region;
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers,
    body: payload,
  });

  if (streamEnabled) {
    if (!response.ok) {
      const errorPayload = await response.text();
      sendJson(res, response.status, safeJsonParse(errorPayload));
      return null;
    }

    const bodyStream = response.body;
    if (!bodyStream) {
      sendJson(res, 500, { error: '混元服务未返回有效的流式响应。' });
      return null;
    }

    res.statusCode = response.status;
    const contentType = response.headers.get('content-type') || 'text/event-stream';
    res.setHeader('Content-Type', contentType);
    const cacheControl = response.headers.get('cache-control') || 'no-cache';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Connection', 'keep-alive');
    const requestId = response.headers.get('x-tc-requestid');
    if (requestId) {
      res.setHeader('x-tc-requestid', requestId);
    }

    const nodeStream = Readable.fromWeb(bodyStream);
    for await (const chunk of nodeStream) {
      res.write(chunk);
    }
    res.end();
    return null;
  }

  const responseText = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: responseText,
  };
}

function safeJsonParse(payload) {
  if (!payload) {
    return { error: '混元服务返回空响应。' };
  }
  try {
    const parsed = JSON.parse(payload);
    return parsed;
  } catch {
    return { error: payload };
  }
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ALLOW_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/hunyuan/chat') {
    sendJson(res, 404, { error: 'Not Found' });
    return;
  }

  const chunks = [];
  req.on('data', chunk => chunks.push(Buffer.from(chunk)));
  req.on('error', error => {
    sendJson(res, 500, { error: error.message ?? '请求读取失败' });
  });
  req.on('end', async () => {
    try {
      const bodyBuffer = Buffer.concat(chunks);
      const proxyResult = await forwardToHunyuan(bodyBuffer, res);

      if (!proxyResult) {
        return;
      }

      res.statusCode = proxyResult.status;
      const contentType = proxyResult.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else if (proxyResult.body) {
        res.setHeader('Content-Type', 'application/json');
      }
      const requestId = proxyResult.headers.get('x-tc-requestid');
      if (requestId) {
        res.setHeader('x-tc-requestid', requestId);
      }
      res.end(proxyResult.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : '混元代理服务异常';
      // eslint-disable-next-line no-console
      console.error('[hunyuan-proxy] request failed:', error);
      sendJson(res, 500, { error: message });
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[hunyuan-proxy] listening on http://localhost:${PORT}`);
});
