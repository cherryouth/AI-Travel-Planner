<template>
  <section class="map-page">
    <el-page-header content="地图导航" class="map-page__header" />

    <el-card shadow="hover" class="map-card">
      <el-form :model="form" label-width="80px" class="map-form" @submit.prevent>
        <el-form-item label="导航模式">
          <el-radio-group v-model="navMode" class="map-form__modes">
            <el-radio-button label="driving">驾车</el-radio-button>
            <el-radio-button label="walking">步行</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="起点">
          <el-input
            v-model="form.origin"
            placeholder="输入起点，或使用定位"
            clearable
            @focus="handleFieldFocus('origin')"
            @keyup.enter="handleSearchRoute"
          />
        </el-form-item>

        <el-form-item label="终点">
          <el-input
            v-model="form.destination"
            placeholder="输入目的地或地址"
            clearable
            @focus="handleFieldFocus('destination')"
            @keyup.enter="handleSearchRoute"
          />
        </el-form-item>

        <el-form-item label="操作">
          <el-space wrap>
            <el-button
              type="primary"
              :loading="loadingRoute"
              :disabled="!mapReady"
              @click="handleSearchRoute"
            >
              规划路线
            </el-button>
            <el-button :loading="locating" :disabled="!mapReady" @click="locateCurrentPosition">
              使用当前位置
            </el-button>
            <el-button :disabled="!form.origin && !form.destination" @click="swapLocations">
              交换起终点
            </el-button>
            <el-button link :disabled="!routeSummary" @click="clearRoutes">清除路线</el-button>
          </el-space>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="mapError"
        type="error"
        :closable="false"
        show-icon
        class="map-alert"
        :title="mapError"
      />

      <div v-if="routeSummary" class="map-summary">
        <el-tag type="success" effect="dark">{{ formatModeLabel(routeSummary.mode) }}</el-tag>
        <span>距离：{{ formatDistance(routeSummary.distance) }}</span>
        <span>耗时：{{ formatDuration(routeSummary.duration) }}</span>
        <span v-if="routeSummary.taxiCost && routeSummary.taxiCost > 0">
          打车费估算：¥{{ routeSummary.taxiCost.toFixed(0) }}
        </span>
      </div>

      <div class="map-layout">
        <div class="map-container">
          <div v-if="isLoadingMap" class="map-loading">
            <el-skeleton animated :rows="6" />
          </div>
          <div
            v-else
            ref="mapContainer"
            class="map-canvas"
            role="application"
            aria-label="高德地图"
          />
          <el-empty v-if="!isLoadingMap && !mapReady" description="地图加载失败，请稍后重试" />
        </div>

        <aside class="map-panel">
          <header class="map-panel__header">
            <span>路线详情</span>
            <small>规划路线后将在此展示每一步导航提示</small>
          </header>
          <el-scrollbar class="map-panel__body" view-class="map-panel__scroll">
            <div v-if="loadingRoute" class="map-panel__loading">
              <el-skeleton animated :rows="4" />
            </div>
            <el-empty v-else-if="!routeSummary" description="尚未生成路线" :image-size="90" />
            <ul v-else class="map-steps">
              <li v-for="(step, index) in routeSteps" :key="`${index}-${step.instruction}`">
                <div class="map-steps__row">
                  <strong>{{ index + 1 }}.</strong>
                  <span>{{ step.instruction }}</span>
                </div>
                <div class="map-steps__meta">
                  <small v-if="typeof step.distance === 'number' && step.distance > 0">
                    距离 {{ formatDistance(step.distance) }}
                  </small>
                  <small v-if="typeof step.duration === 'number' && step.duration > 0">
                    预计 {{ formatDuration(step.duration) }}
                  </small>
                </div>
              </li>
            </ul>
          </el-scrollbar>
        </aside>
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { loadAmap } from '../services/amapLoader';

type NavMode = 'driving' | 'walking';

interface RouteSummary {
  distance: number;
  duration: number;
  taxiCost?: number;
  mode: NavMode;
}

interface RouteStep {
  instruction: string;
  distance?: number;
  duration?: number;
}

interface GeolocationResult {
  position: { lng: number; lat: number };
  formattedAddress?: string;
  addressComponent?: {
    city?: string;
    province?: string;
    district?: string;
  };
}

type PlainRecord = Record<string, unknown>;

const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = ref<AMap.Map | null>(null);
const locationMarker = ref<AMap.Marker | null>(null);

const isLoadingMap = ref(true);
const mapError = ref<string | null>(null);
const loadingRoute = ref(false);
const locating = ref(false);

const navMode = ref<NavMode>('driving');
const activeField = ref<'origin' | 'destination'>('origin');

const form = reactive({
  origin: '',
  destination: '',
});

const routeSummary = ref<RouteSummary | null>(null);
const routeSteps = ref<RouteStep[]>([]);

const services = reactive<{ driving?: AMap.Driving; walking?: AMap.Walking }>({});

const mapReady = computed(() => Boolean(mapInstance.value) && !mapError.value);

watch(navMode, () => {
  clearRoutes();
});

onMounted(() => {
  void initMap();
});

onBeforeUnmount(() => {
  clearRoutes();
  if (locationMarker.value) {
    locationMarker.value.setMap(null);
    locationMarker.value = null;
  }
  if (mapInstance.value) {
    mapInstance.value.destroy();
    mapInstance.value = null;
  }
});

async function initMap() {
  isLoadingMap.value = true;
  mapError.value = null;
  try {
    await nextTick();
    const AMap = await loadAmap();
    if (!mapContainer.value) {
      throw new Error('未找到地图容器元素');
    }
    mapInstance.value = new AMap.Map(mapContainer.value, {
      viewMode: '3D',
      zoom: 11,
      center: [116.397428, 39.90923],
      pitch: 35,
    });
    mapInstance.value.addControl(new AMap.Scale());
    mapInstance.value.addControl(
      new AMap.ToolBar({
        position: { right: '20px', top: '40px' },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    mapError.value = message;
    ElMessage.error(message);
  } finally {
    isLoadingMap.value = false;
  }
}

async function getNavigationService(mode: NavMode) {
  const AMap = await loadAmap();
  const map = mapInstance.value;
  if (!map) {
    throw new Error('地图尚未加载完成');
  }

  if (mode === 'driving') {
    if (!services.driving) {
      services.driving = new AMap.Driving({
        map,
        showTraffic: true,
        autoFitView: true,
        extensions: 'all',
      });
    }
    return services.driving;
  }

  if (!services.walking) {
    services.walking = new AMap.Walking({
      map,
      autoFitView: true,
    });
  }
  return services.walking;
}

function clearRoutes() {
  routeSummary.value = null;
  routeSteps.value = [];
  if (services.driving) {
    services.driving.clear();
  }
  if (services.walking) {
    services.walking.clear();
  }
}

function handleFieldFocus(field: 'origin' | 'destination') {
  activeField.value = field;
}

function swapLocations() {
  [form.origin, form.destination] = [form.destination, form.origin];
}

async function handleSearchRoute() {
  if (!form.origin.trim() || !form.destination.trim()) {
    ElMessage.warning('请填写起点和终点后再规划路线');
    return;
  }
  if (!mapReady.value) {
    ElMessage.error('地图尚未就绪，暂无法规划路线');
    return;
  }

  loadingRoute.value = true;
  try {
    const service = await getNavigationService(navMode.value);
    service.clear();
    await new Promise<void>((resolve, reject) => {
      service.search(
        { keyword: form.origin.trim() },
        { keyword: form.destination.trim() },
        (status: string, result: unknown) => {
          if (status === 'complete') {
            try {
              updateRouteInfo(navMode.value, result);
              mapInstance.value?.setFitView(undefined, true, [120, 160, 120, 180]);
              resolve();
            } catch (parseError) {
              const message = parseError instanceof Error ? parseError.message : '路线解析失败';
              reject(new Error(message));
            }
          } else {
            const message = extractResultMessage(result) ?? '路线规划失败，请确认输入是否正确';
            reject(new Error(message));
          }
        },
      );
    });
  } catch (error) {
    clearRoutes();
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loadingRoute.value = false;
  }
}

async function locateCurrentPosition() {
  if (locating.value) {
    return;
  }
  if (!mapReady.value) {
    ElMessage.error('地图尚未就绪，无法获取当前位置');
    return;
  }

  locating.value = true;
  try {
    const AMap = await loadAmap();
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      convert: true,
      showButton: false,
      showCircle: false,
    });

    const result = await new Promise<GeolocationResult>((resolve, reject) => {
      geolocation.getCurrentPosition((status: string, data: unknown) => {
        if (status === 'complete' && isPlainObject(data)) {
          const position = extractLngLat(data.position);
          if (position) {
            resolve({
              position,
              formattedAddress:
                typeof data.formattedAddress === 'string' ? data.formattedAddress : undefined,
              addressComponent: isPlainObject(data.addressComponent)
                ? (data.addressComponent as GeolocationResult['addressComponent'])
                : undefined,
            });
            return;
          }
        }
        const message = extractResultMessage(data) ?? '定位失败，请稍后重试';
        reject(new Error(message));
      });
    });

    const { lng, lat } = result.position;
    const map = mapInstance.value;
    if (!map) {
      throw new Error('地图尚未就绪');
    }

    geolocation.destroy();

    const address = result.formattedAddress ?? `${lng.toFixed(6)},${lat.toFixed(6)}`;
    if (activeField.value === 'origin') {
      form.origin = address;
    } else {
      form.destination = address;
    }

    if (!locationMarker.value) {
      locationMarker.value = new AMap.Marker({
        position: [lng, lat],
        map,
        title: '当前位置',
      });
    } else {
      locationMarker.value.setMap(map);
      locationMarker.value.setPosition([lng, lat]);
    }

    map.setZoomAndCenter(14, [lng, lat]);
    ElMessage.success('已获取当前位置');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    locating.value = false;
  }
}

function updateRouteInfo(mode: NavMode, result: unknown) {
  if (!isPlainObject(result)) {
    throw new Error('路线返回格式异常');
  }

  const routesSource = Array.isArray(result.routes) ? result.routes : [];
  if (routesSource.length === 0) {
    throw new Error('未获取到有效路线');
  }

  const route = routesSource[0];
  if (!isPlainObject(route)) {
    throw new Error('路线数据格式异常');
  }

  const distance = getNumber(route.distance, 0);
  const duration = getNumber(route.time ?? route.duration, 0);
  const taxiCostValue = getNumber(route.taxi_cost ?? route.taxiCost, 0);

  routeSummary.value = {
    mode,
    distance,
    duration,
    taxiCost: mode === 'driving' && taxiCostValue > 0 ? taxiCostValue : undefined,
  };

  const stepsSource = Array.isArray(route.steps) ? route.steps : [];
  const normalizedSteps: RouteStep[] = [];
  stepsSource.forEach((step, index) => {
    if (!isPlainObject(step)) {
      return;
    }
    const instruction =
      typeof step.instruction === 'string' ? step.instruction : `第 ${index + 1} 段`;
    const stepDistance = getNumber(step.distance, 0);
    const stepDuration = getNumber(step.time ?? step.duration, 0);
    normalizedSteps.push({
      instruction: stripHtml(instruction),
      distance: stepDistance > 0 ? stepDistance : undefined,
      duration: stepDuration > 0 ? stepDuration : undefined,
    });
  });
  routeSteps.value = normalizedSteps;
}

function extractResultMessage(result: unknown): string | null {
  if (typeof result === 'string') {
    return result;
  }
  if (!isPlainObject(result)) {
    return null;
  }
  if (typeof result.info === 'string' && result.info) {
    return result.info;
  }
  if (typeof result.message === 'string' && result.message) {
    return result.message;
  }
  return null;
}

function isPlainObject(value: unknown): value is PlainRecord {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function extractLngLat(value: unknown): { lng: number; lat: number } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as PlainRecord & {
    lng?: number;
    lat?: number;
    getLng?: () => number;
    getLat?: () => number;
  };

  if (typeof record.lng === 'number' && typeof record.lat === 'number') {
    return { lng: record.lng, lat: record.lat };
  }

  const lng = typeof record.getLng === 'function' ? record.getLng() : undefined;
  const lat = typeof record.getLat === 'function' ? record.getLat() : undefined;
  if (typeof lng === 'number' && typeof lat === 'number') {
    return { lng, lat };
  }

  return null;
}

function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDistance(distance: number): string {
  if (!Number.isFinite(distance) || distance <= 0) {
    return '—';
  }
  if (distance < 1000) {
    return `${Math.round(distance)} 米`;
  }
  return `${(distance / 1000).toFixed(1)} 公里`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '—';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) {
    return '少于 1 分钟';
  }
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} 小时 ${remainingMinutes} 分钟` : `${hours} 小时`;
}

function formatModeLabel(mode: NavMode): string {
  return mode === 'driving' ? '驾车导航' : '步行导航';
}
</script>

<style scoped>
.map-page {
  display: grid;
  gap: 1.5rem;
}

.map-form {
  display: grid;
  gap: 0.75rem;
}

.map-form__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.map-card {
  display: grid;
  gap: 1.25rem;
}

.map-alert {
  margin-top: -0.5rem;
}

.map-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.95rem;
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 1.5rem;
  align-items: stretch;
}

.map-container {
  position: relative;
  min-height: 480px;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 480px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--el-border-color-light);
}

.map-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  z-index: 2;
}

.map-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 480px;
}

.map-panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 600;
}

.map-panel__header small {
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.map-panel__body {
  flex: 1;
  border: 1px solid var(--el-border-color);
  border-radius: 16px;
  padding: 0.75rem;
  background: var(--el-fill-color-blank);
}

.map-panel__scroll {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.map-panel__loading {
  padding: 0.5rem;
}

.map-steps {
  display: grid;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.map-steps li {
  display: grid;
  gap: 0.4rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px dashed var(--el-border-color-light);
}

.map-steps li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.map-steps__row {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}

.map-steps__row strong {
  color: var(--el-color-primary);
}

.map-steps__meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

@media (max-width: 1024px) {
  .map-layout {
    grid-template-columns: 1fr;
  }

  .map-panel {
    min-height: auto;
  }

  .map-canvas {
    min-height: 420px;
  }
}

@media (max-width: 600px) {
  .map-canvas {
    min-height: 360px;
  }
}
</style>
