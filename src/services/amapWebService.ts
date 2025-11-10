import type { Ref } from 'vue';

export type Coordinates = [number, number];
export type NavMode = 'driving' | 'walking' | 'transit';

interface GeocodeResponse {
  status: '0' | '1';
  info: string;
  geocodes?: Array<{
    formatted_address?: string;
    location?: string;
    city?: string | string[];
    province?: string | string[];
    district?: string | string[];
    adcode?: string;
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

interface TransitDirectionResponse {
  status: '0' | '1';
  info: string;
  route?: {
    transits?: Array<{
      distance?: string;
      duration?: string;
      cost?: string;
      walking_distance?: string;
      nightflag?: string;
      segments?: Array<{
        entrance?: { name?: string };
        exit?: { name?: string };
        walking?: {
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
        };
        bus?: {
          buslines?: Array<{
            name?: string;
            type?: string;
            distance?: string;
            duration?: string;
            via_num?: string;
            departure_stop?: { name?: string };
            arrival_stop?: { name?: string };
            polyline?: string;
            via_stops?: Array<{ name?: string }>;
          }>;
        };
        railway?: {
          name?: string;
          distance?: string;
          duration?: string;
          departure_stop?: { name?: string };
          arrival_stop?: { name?: string };
          stations?: Array<{ name?: string }>;
          spaces?: string;
        };
        taxi?: {
          distance?: string;
          duration?: string;
          polyline?: string;
          name?: string;
          price?: string;
        };
      }>;
    }>;
  };
}

type TransitPlan = NonNullable<NonNullable<TransitDirectionResponse['route']>['transits']>[number];
type TransitSegment = NonNullable<NonNullable<TransitPlan['segments']>[number]>;
type TransitWalkingStep = NonNullable<
  NonNullable<NonNullable<TransitSegment['walking']>['steps']>[number]
>;

interface InputTipsResponse {
  status: '0' | '1';
  info: string;
  tips?: Array<{
    name?: string;
    district?: string;
    address?: string;
    location?: string;
    adcode?: string;
    typecode?: string;
  }>;
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
      city?: string | string[];
      province?: string | string[];
      district?: string | string[];
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

export interface RouteCost {
  amount: number;
  type: 'taxi' | 'transit' | 'other';
  label: string;
}

export interface RouteStepResult {
  instruction: string;
  distance?: number;
  duration?: number;
  polyline: Coordinates[];
  action?: string;
  assistantAction?: string;
  mode?: 'drive' | 'walk' | 'bus' | 'railway' | 'taxi' | 'transfer';
}

export interface RouteResult {
  distance: number;
  duration: number;
  steps: RouteStepResult[];
  cost?: RouteCost;
}

export interface LocationSuggestion {
  name: string;
  district?: string;
  address?: string;
  location?: Coordinates;
  adcode?: string;
  typeCode?: string;
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
  city?: string;
  province?: string;
  district?: string;
  adcode?: string;
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
    city: normalizeAdministrativeValue(geocode.city),
    province: normalizeAdministrativeValue(geocode.province),
    district: normalizeAdministrativeValue(geocode.district),
    adcode: geocode.adcode,
  };
}

export async function fetchRoute(
  mode: NavMode,
  origin: Coordinates,
  destination: Coordinates,
  options?: {
    city?: string;
    destinationCity?: string;
  },
): Promise<RouteResult> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法调用路径规划。');
  }

  if (mode === 'transit') {
    const url = new URL('/v3/direction/transit/integrated', AMAP_WEB_SERVICE_BASE_URL);
    url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
    url.searchParams.set('origin', formatCoordinates(origin));
    url.searchParams.set('destination', formatCoordinates(destination));
    url.searchParams.set('extensions', 'all');
    if (options?.city) {
      url.searchParams.set('city', options.city);
    }
    if (options?.destinationCity) {
      url.searchParams.set('cityd', options.destinationCity);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`路径规划请求失败（${response.status}）`);
    }

    const payload = (await response.json()) as TransitDirectionResponse;
    if (payload.status !== '1') {
      throw new Error(payload.info || '公共交通路径规划失败');
    }

    const transitPlan = payload.route?.transits?.[0];
    if (!transitPlan) {
      throw new Error('未获取到有效的公共交通方案');
    }
    return normalizeTransitResult(transitPlan);
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
    return normalizeRouteResult(payload.route?.paths?.[0], payload.route?.taxi_cost, mode);
  }

  const payload = (await response.json()) as WalkingDirectionResponse;
  if (payload.status !== '1') {
    throw new Error(payload.info || '步行路径规划失败');
  }
  return normalizeRouteResult(payload.route?.paths?.[0], undefined, mode);
}

export async function fetchLocationSuggestions(
  keywords: string,
  options?: {
    city?: string;
    location?: Coordinates;
    typeCode?: string;
    signal?: AbortSignal;
  },
): Promise<LocationSuggestion[]> {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error('未配置 VITE_AMAP_WEB_SERVICE_KEY，无法获取地点提示。');
  }

  const query = keywords.trim();
  if (!query) {
    return [];
  }

  const url = new URL('/v3/assistant/inputtips', AMAP_WEB_SERVICE_BASE_URL);
  url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
  url.searchParams.set('keywords', query);
  url.searchParams.set('datatype', 'poi');

  if (options?.city) {
    url.searchParams.set('city', options.city);
  }
  if (options?.location) {
    url.searchParams.set('location', formatCoordinates(options.location));
  }
  if (options?.typeCode) {
    url.searchParams.set('typecode', options.typeCode);
  }

  const requestInit: RequestInit = {};
  if (options?.signal) {
    requestInit.signal = options.signal;
  }

  const response = await fetch(url.toString(), requestInit);
  if (!response.ok) {
    throw new Error(`地点提示请求失败（${response.status}）`);
  }

  const payload = (await response.json()) as InputTipsResponse;
  if (payload.status !== '1') {
    throw new Error(payload.info || '地点提示查询失败');
  }

  const tips = Array.isArray(payload.tips) ? payload.tips : [];
  const suggestions: LocationSuggestion[] = [];

  tips.forEach(tip => {
    if (!tip?.name) {
      return;
    }
    const suggestion: LocationSuggestion = {
      name: tip.name,
      district: tip.district,
      address: tip.address,
      adcode: tip.adcode,
      typeCode: tip.typecode,
    };
    const coords = parseCoordinates(tip.location);
    if (coords) {
      suggestion.location = coords;
    }
    suggestions.push(suggestion);
  });

  return suggestions;
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
    city: normalizeAdministrativeValue(regeocode.addressComponent?.city),
    province: normalizeAdministrativeValue(regeocode.addressComponent?.province),
    district: normalizeAdministrativeValue(regeocode.addressComponent?.district),
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
  taxiCost: string | undefined,
  mode: NavMode,
): RouteResult {
  if (!path) {
    throw new Error('未获取到有效的路径方案');
  }

  const distance = safeNumber(path.distance);
  const duration = safeNumber(path.duration);
  const normalizedSteps: RouteStepResult[] = [];

  const steps = Array.isArray(path.steps) ? path.steps : [];
  const stepMode: RouteStepResult['mode'] = mode === 'walking' ? 'walk' : 'drive';
  steps.forEach(step => {
    if (!step) {
      return;
    }
    const coords = parsePolyline(step.polyline);
    if (!coords.length) {
      return;
    }
    normalizedSteps.push({
      instruction:
        sanitizeInstruction(step.instruction) ??
        (mode === 'walking' ? '步行继续前进' : '继续向前行驶'),
      distance: safeNumber(step.distance),
      duration: safeNumber(step.duration),
      polyline: coords,
      action: sanitizeInstruction(step.action),
      assistantAction: sanitizeInstruction(step.assistant_action),
      mode: stepMode,
    });
  });

  const costAmount = safeNumber(taxiCost);

  return {
    distance: normalizeMetric(distance),
    duration: normalizeMetric(duration),
    steps: normalizedSteps,
    cost:
      typeof costAmount === 'number'
        ? {
            amount: costAmount,
            type: 'taxi',
            label: '打车费估算',
          }
        : undefined,
  };
}

function normalizeTransitResult(transit: TransitPlan): RouteResult {
  const steps: RouteStepResult[] = [];
  const segments = Array.isArray(transit.segments) ? transit.segments : [];

  segments.forEach(segment => {
    if (!segment) {
      return;
    }

    if (segment.entrance?.name) {
      steps.push({
        instruction: `[换乘] 进入 ${sanitizeInstruction(segment.entrance.name) ?? segment.entrance.name}`,
        polyline: [],
        mode: 'transfer',
      });
    }

    appendWalkingStep(segment, steps);
    appendBusSteps(segment, steps);
    appendRailwayStep(segment, steps);
    appendTaxiStep(segment, steps);

    if (segment.exit?.name) {
      steps.push({
        instruction: `[换乘] 离开 ${sanitizeInstruction(segment.exit.name) ?? segment.exit.name}`,
        polyline: [],
        mode: 'transfer',
      });
    }
  });

  if (!steps.length) {
    steps.push({
      instruction: '请参考地图指引完成出行',
      polyline: [],
    });
  }

  const distance = safeNumber(transit.distance);
  const duration = safeNumber(transit.duration);
  const costAmount = safeNumber(transit.cost);

  return {
    distance: normalizeMetric(distance),
    duration: normalizeMetric(duration),
    steps,
    cost:
      typeof costAmount === 'number'
        ? {
            amount: costAmount,
            type: 'transit',
            label: '预计票价',
          }
        : undefined,
  };
}

function appendWalkingStep(segment: TransitSegment, steps: RouteStepResult[]) {
  const walking = segment.walking;
  if (!walking) {
    return;
  }

  const walkingSteps = Array.isArray(walking.steps) ? (walking.steps as TransitWalkingStep[]) : [];
  const polyline: Coordinates[] = [];
  const instructions: string[] = [];

  walkingSteps.forEach((step: TransitWalkingStep) => {
    if (!step) {
      return;
    }
    const sanitized = sanitizeInstruction(step.instruction);
    if (sanitized) {
      instructions.push(sanitized);
    }
    const coords = parsePolyline(step.polyline);
    if (coords.length) {
      polyline.push(...coords);
    }
  });

  const distance = safeNumber(walking.distance);
  const duration = safeNumber(walking.duration);
  let instruction = '[步行] 前往下一换乘点';
  if (instructions.length) {
    instruction = `[步行] ${instructions.join('，')}`;
  } else if (distance) {
    instruction = `[步行] 前往下一换乘点（约 ${Math.round(distance)} 米）`;
  }

  steps.push({
    instruction,
    distance,
    duration,
    polyline,
    mode: 'walk',
  });
}

function appendBusSteps(segment: TransitSegment, steps: RouteStepResult[]) {
  const buslines = segment.bus?.buslines;
  if (!Array.isArray(buslines) || !buslines.length) {
    return;
  }

  buslines.forEach(line => {
    if (!line) {
      return;
    }
    const name = sanitizeInstruction(line.name) ?? '公交线路';
    const departure = sanitizeInstruction(line.departure_stop?.name);
    const arrival = sanitizeInstruction(line.arrival_stop?.name);
    const viaStops = safeNumber(line.via_num);
    const viaText = typeof viaStops === 'number' && viaStops > 0 ? `，途经 ${viaStops} 站` : '';

    const instruction = `[公交] 乘坐${name}${
      departure ? `，从 ${departure} 上车` : ''
    }${arrival ? `，前往 ${arrival}` : ''}${viaText}`;

    const polyline = parsePolyline(line.polyline);

    steps.push({
      instruction,
      distance: safeNumber(line.distance),
      duration: safeNumber(line.duration),
      polyline,
      mode: 'bus',
    });
  });
}

function appendRailwayStep(segment: TransitSegment, steps: RouteStepResult[]) {
  const railway = segment.railway;
  if (!railway) {
    return;
  }

  const parts: string[] = [];
  parts.push(`[轨道] 乘坐${sanitizeInstruction(railway.name) ?? '轨道交通'}`);
  const departure = sanitizeInstruction(railway.departure_stop?.name);
  if (departure) {
    parts.push(`从 ${departure} 上车`);
  }
  const arrival = sanitizeInstruction(railway.arrival_stop?.name);
  if (arrival) {
    parts.push(`前往 ${arrival}`);
  }
  const stationCount = Array.isArray(railway.stations) ? railway.stations.length : 0;
  if (stationCount > 0) {
    parts.push(`共 ${stationCount} 站`);
  }

  const polyline = parsePolyline(railway.spaces);

  steps.push({
    instruction: parts.join('，'),
    distance: safeNumber(railway.distance),
    duration: safeNumber(railway.duration),
    polyline,
    mode: 'railway',
  });
}

function appendTaxiStep(segment: TransitSegment, steps: RouteStepResult[]) {
  const taxi = segment.taxi;
  if (!taxi) {
    return;
  }

  const name = sanitizeInstruction(taxi.name) ?? '出租车';
  const instruction = `[出租车] 乘坐${name}完成当前路段`;

  steps.push({
    instruction,
    distance: safeNumber(taxi.distance),
    duration: safeNumber(taxi.duration),
    polyline: parsePolyline(taxi.polyline),
    mode: 'taxi',
  });
}

function normalizeMetric(value: number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return 0;
}

function normalizeAdministrativeValue(
  value: string | string[] | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        const normalized = normalizeAdministrativeString(item);
        if (normalized) {
          return normalized;
        }
      }
    }
    return undefined;
  }
  return normalizeAdministrativeString(value);
}

function normalizeAdministrativeString(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') {
    return undefined;
  }
  return trimmed;
}

function parsePolyline(polyline: string | string[] | undefined | null): Coordinates[] {
  if (!polyline) {
    return [];
  }
  if (Array.isArray(polyline)) {
    const coords: Coordinates[] = [];
    polyline.forEach(point => {
      const parsed = parseCoordinatePoint(point);
      if (parsed) {
        coords.push(parsed);
      }
    });
    return coords;
  }

  const points = polyline.split(';');
  const coords: Coordinates[] = [];
  points.forEach(point => {
    const coord = parseCoordinatePoint(point);
    if (coord) {
      coords.push(coord);
    }
  });
  return coords;
}

function parseCoordinatePoint(point: string | undefined | null): Coordinates | null {
  if (!point) {
    return null;
  }
  return parseCoordinates(point);
}

function sanitizeInstruction(input: string | undefined | null): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const cleaned = input.replace(/<[^>]*>/g, '').trim();
  return cleaned || undefined;
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
