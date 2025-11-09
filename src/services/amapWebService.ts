import type { Ref } from 'vue';

export type Coordinates = [number, number];
export type NavMode = 'driving' | 'walking';

interface GeocodeResponse {
  status: '0' | '1';
  info: string;
  geocodes?: Array<{
    formatted_address?: string;
    location?: string;
  }>;
}

interface DrivingDirectionResponse {
  status: '0' | '1';
  info: string;
  route?: {
    taxi_cost?: string;
    paths?: Array<{
      distance?: string;
      duration?: string;
      steps?: Array<{
        instruction?: string;
        distance?: string;
        duration?: string;
        polyline?: string;
        action?: string;
        assistant_action?: string;
      }>;
    }>;
  };
}

interface WalkingDirectionResponse {
  status: '0' | '1';
  info: string;
  route?: {
    paths?: Array<{
      distance?: string;
      duration?: string;
      steps?: Array<{
        instruction?: string;
        distance?: string;
        duration?: string;
        polyline?: string;
        action?: string;
        assistant_action?: string;
      }>;
    }>;
  };
}

interface CoordinateConvertResponse {
  status: '0' | '1';
  info: string;
  locations?: string;
}

interface ReverseGeocodeResponse {
  status: '0' | '1';
  info: string;
  regeocode?: {
    formatted_address?: string;
    addressComponent?: {
      city?: string;
      province?: string;
      district?: string;
    };
  };
}

interface IpLocationResponse {
  status: '0' | '1';
  info: string;
  adcode?: string;
  province?: string;
  city?: string;
  rectangle?: string;
}

export interface RouteStepResult {
  instruction: string;
  distance?: number;
  duration?: number;
  polyline: Coordinates[];
  action?: string;
  assistantAction?: string;
}

export interface RouteResult {
  distance: number;
  duration: number;
  taxiCost?: number;
  steps: RouteStepResult[];
}

const AMAP_WEB_SERVICE_KEY = import.meta.env.VITE_AMAP_WEB_SERVICE_KEY?.trim();

if (!AMAP_WEB_SERVICE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[AMap] 缺少 VITE_AMAP_WEB_SERVICE_KEY，无法调用高德 Web 服务 API。');
}

const AMAP_WEB_SERVICE_BASE_URL = 'https://restapi.amap.com';

export async function geocodeAddress(address: string): Promise<{
  location: Coordinates;
  formattedAddress?: string;
} | null> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法执行地址解析。');
  }
  const url = new URL('/v3/geocode/geo', AMAP_WEB_SERVICE_BASE_URL);
  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
  url.searchParams.set('address', address);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`地址解析请求失败（${response.status}）`);
  }

  const payload = (await response.json()) as GeocodeResponse;
  if (payload.status !== '1') {
    const err = payload.info || '地址解析失败';
    throw new Error(err);
  }

  const geocode = payload.geocodes?.[0];
  if (!geocode?.location) {
    return null;
  }

  const coords = parseCoordinates(geocode.location);
  if (!coords) {
    return null;
  }

  return {
    location: coords,
    formattedAddress: geocode.formatted_address,
  };
}

export async function fetchRoute(
  mode: NavMode,
  origin: Coordinates,
  destination: Coordinates,
): Promise<RouteResult> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法调用路径规划。');
  }

  const url = new URL(
    mode === 'driving' ? '/v3/direction/driving' : '/v3/direction/walking',
    AMAP_WEB_SERVICE_BASE_URL,
  );

  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
  url.searchParams.set('origin', formatCoordinates(origin));
  url.searchParams.set('destination', formatCoordinates(destination));

  if (mode === 'driving') {
    url.searchParams.set('extensions', 'all');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`路径规划请求失败（${response.status}）`);
  }

  if (mode === 'driving') {
    const payload = (await response.json()) as DrivingDirectionResponse;
    if (payload.status !== '1') {
      throw new Error(payload.info || '驾车路径规划失败');
    }
    return normalizeRouteResult(payload.route?.paths?.[0], payload.route?.taxi_cost);
  }

  const payload = (await response.json()) as WalkingDirectionResponse;
  if (payload.status !== '1') {
    throw new Error(payload.info || '步行路径规划失败');
  }
  return normalizeRouteResult(payload.route?.paths?.[0]);
}

export function parseCoordinates(input: string | null | undefined): Coordinates | null {
  if (!input) {
    return null;
  }

  const parts = input.split(',');
  if (parts.length !== 2) {
    return null;
  }

  const lng = Number.parseFloat(parts[0]);
  const lat = Number.parseFloat(parts[1]);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return [lng, lat];
}

export function detectCoordinateText(value: string): Coordinates | null {
  const trimmed = value.trim();
  const numericMatch = /^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/u.exec(trimmed);
  if (!numericMatch) {
    return null;
  }

  const lng = Number.parseFloat(numericMatch[1]);
  const lat = Number.parseFloat(numericMatch[2]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  return [lng, lat];
}

export function formatCoordinates([lng, lat]: Coordinates): string {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

export async function convertGpsToGcj(coordinates: Coordinates): Promise<Coordinates> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法执行坐标转换。');
  }

  const url = new URL('/v3/assistant/coordinate/convert', AMAP_WEB_SERVICE_BASE_URL);
  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
  url.searchParams.set('coordsys', 'gps');
  url.searchParams.set('locations', formatCoordinates(coordinates));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`坐标转换请求失败（${response.status}）`);
  }

  const payload = (await response.json()) as CoordinateConvertResponse;
  if (payload.status !== '1' || !payload.locations) {
    throw new Error(payload.info || '坐标转换失败');
  }

  const converted = parseCoordinates(payload.locations.split(';')[0]);
  if (!converted) {
    throw new Error('坐标转换结果解析失败');
  }
  return converted;
}

export async function reverseGeocode(location: Coordinates): Promise<{
  formattedAddress?: string;
  city?: string;
  province?: string;
  district?: string;
} | null> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法执行逆地理编码。');
  }

  const url = new URL('/v3/geocode/regeo', AMAP_WEB_SERVICE_BASE_URL);
  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
  url.searchParams.set('location', formatCoordinates(location));
  url.searchParams.set('radius', '1000');
  url.searchParams.set('extensions', 'base');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`逆地理编码请求失败（${response.status}）`);
  }

  const payload = (await response.json()) as ReverseGeocodeResponse;
  if (payload.status !== '1') {
    throw new Error(payload.info || '逆地理编码失败');
  }

  const regeocode = payload.regeocode;
  if (!regeocode) {
    return null;
  }

  return {
    formattedAddress: regeocode.formatted_address,
    city: regeocode.addressComponent?.city,
    province: regeocode.addressComponent?.province,
    district: regeocode.addressComponent?.district,
  };
}

export async function locateByIP(): Promise<{
  location: Coordinates;
  city?: string;
  province?: string;
  adcode?: string;
} | null> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法执行 IP 定位。');
  }

  const url = new URL('/v3/ip', AMAP_WEB_SERVICE_BASE_URL);
  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`IP 定位请求失败（${response.status}）`);
  }

  const payload = (await response.json()) as IpLocationResponse;
  if (payload.status !== '1' || !payload.rectangle) {
    return null;
  }

  const center = rectangleToCenter(payload.rectangle);
  if (!center) {
    return null;
  }

  return {
    location: center,
    city: payload.city,
    province: payload.province,
    adcode: payload.adcode,
  };
}

function rectangleToCenter(rectangle: string): Coordinates | null {
  const parts = rectangle.split(';');
  if (parts.length !== 2) {
    return null;
  }
  const first = parseCoordinates(parts[0]);
  const second = parseCoordinates(parts[1]);
  if (!first || !second) {
    return null;
  }

  const lng = (first[0] + second[0]) / 2;
  const lat = (first[1] + second[1]) / 2;
  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

function normalizeRouteResult(
  path:
    | (DrivingDirectionResponse['route'] extends infer R
        ? R extends { paths?: Array<infer P> }
          ? P
          : never
        : never)
    | undefined,
  taxiCost?: string,
): RouteResult {
  if (!path) {
    throw new Error('未获取到有效的路径方案');
  }

  const distance = Number(path.distance ?? 0);
  const duration = Number(path.duration ?? 0);
  const normalizedSteps: RouteStepResult[] = [];

  const steps = Array.isArray(path.steps) ? path.steps : [];
  steps.forEach(step => {
    if (!step) {
      return;
    }
    const coords = parsePolyline(step.polyline);
    if (!coords.length) {
      return;
    }
    normalizedSteps.push({
      instruction: sanitizeInstruction(step.instruction) ?? '行驶/步行继续',
      distance: safeNumber(step.distance),
      duration: safeNumber(step.duration),
      polyline: coords,
      action: sanitizeInstruction(step.action),
      assistantAction: sanitizeInstruction(step.assistant_action),
    });
  });

  return {
    distance: Number.isFinite(distance) && distance > 0 ? distance : 0,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    taxiCost: safeNumber(taxiCost),
    steps: normalizedSteps,
  };
}

function parsePolyline(polyline: string | undefined): Coordinates[] {
  if (!polyline) {
    return [];
  }
  const points = polyline.split(';');
  const coords: Coordinates[] = [];
  points.forEach(point => {
    const coord = parseCoordinates(point);
    if (coord) {
      coords.push(coord);
    }
  });
  return coords;
}

function sanitizeInstruction(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }
  return input.replace(/<[^>]*>/g, '').trim();
}

function safeNumber(value: string | number | undefined | null): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function useRouteAbortController(refContainer: Ref<AbortController | null>) {
  if (refContainer.value) {
    refContainer.value.abort();
  }
  refContainer.value = new AbortController();
  return refContainer.value;
}
