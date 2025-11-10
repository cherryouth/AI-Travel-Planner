<template>
  <section class="map-page">
    <el-page-header content="地图导航" class="map-page__header" />

    <el-card shadow="hover" class="map-card">
      <el-form
        :model="form"
        label-width="80px"
        class="map-form"
        @submit.prevent="handleSearchRoute"
      >
        <el-form-item label="导航模式">
          <el-radio-group v-model="navMode" class="map-form__modes">
            <el-radio-button label="driving">驾车</el-radio-button>
            <el-radio-button label="walking">步行</el-radio-button>
            <el-radio-button label="transit">公共交通</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="起点">
          <el-autocomplete
            v-model="form.origin"
            placeholder="输入起点，或使用定位"
            clearable
            :fetch-suggestions="originSuggestionProvider"
            :debounce="250"
            value-key="value"
            highlight-first-item
            @focus="handleFieldFocus('origin')"
            @select="handleSuggestionSelect('origin', $event)"
            @clear="handleLocationClear('origin')"
          >
            <template #default="{ item }">
              <div class="map-suggestion">
                <span class="map-suggestion__title">{{ item.name }}</span>
                <span v-if="item.address || item.district" class="map-suggestion__meta">
                  {{ item.district }}{{ item.address }}
                </span>
              </div>
            </template>
          </el-autocomplete>
        </el-form-item>

        <el-form-item label="终点">
          <el-autocomplete
            v-model="form.destination"
            placeholder="输入目的地或地址"
            clearable
            :fetch-suggestions="destinationSuggestionProvider"
            :debounce="250"
            value-key="value"
            highlight-first-item
            @focus="handleFieldFocus('destination')"
            @select="handleSuggestionSelect('destination', $event)"
            @clear="handleLocationClear('destination')"
          >
            <template #default="{ item }">
              <div class="map-suggestion">
                <span class="map-suggestion__title">{{ item.name }}</span>
                <span v-if="item.address || item.district" class="map-suggestion__meta">
                  {{ item.district }}{{ item.address }}
                </span>
              </div>
            </template>
          </el-autocomplete>
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
        <span v-if="routeSummary.cost">
          {{ routeSummary.cost.label }}：¥{{ formatCost(routeSummary.cost.amount) }}
        </span>
      </div>

      <div class="map-layout">
        <div class="map-container">
          <div ref="mapContainer" class="map-canvas" role="application" aria-label="高德地图" />
          <div v-if="isLoadingMap" class="map-loading">
            <el-skeleton animated :rows="6" />
          </div>
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
import {
  convertGpsToGcj,
  detectCoordinateText,
  fetchLocationSuggestions,
  fetchRoute,
  geocodeAddress,
  locateByIP,
  reverseGeocode,
  type Coordinates,
  type LocationSuggestion,
  type NavMode,
  type RouteCost,
  type RouteResult,
  type RouteStepResult,
} from '../services/amapWebService';

interface RouteSummary {
  distance: number;
  duration: number;
  mode: NavMode;
  cost?: RouteCost;
}

interface RouteStepDisplay {
  instruction: string;
  distance?: number;
  duration?: number;
  mode?: RouteStepResult['mode'];
}

interface SuggestionOption extends LocationSuggestion {
  value: string;
}

interface CachedLocation {
  text: string;
  coords: Coordinates | null;
  city: string | null;
  province: string | null;
  district: string | null;
  adcode: string | null;
}

interface ResolvedLocation {
  coords: Coordinates;
  city: string | null;
}

const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = ref<AMap.Map | null>(null);
const locationMarker = ref<AMap.Marker | null>(null);

const isLoadingMap = ref(true);
const mapError = ref<string | null>(null);
const loadingRoute = ref(false);
const locating = ref(false);
const suggestionAbort = ref<AbortController | null>(null);

const navMode = ref<NavMode>('driving');
const activeField = ref<'origin' | 'destination'>('origin');

const form = reactive({
  origin: '',
  destination: '',
});

const routeSummary = ref<RouteSummary | null>(null);
const routeSteps = ref<RouteStepDisplay[]>([]);
const routePolyline = ref<AMap.Polyline | null>(null);

function createEmptyLocation(): CachedLocation {
  return {
    text: '',
    coords: null,
    city: null,
    province: null,
    district: null,
    adcode: null,
  };
}

const locationCache = reactive({
  origin: createEmptyLocation(),
  destination: createEmptyLocation(),
});

const mapReady = computed(() => Boolean(mapInstance.value) && !mapError.value);

const originSuggestionProvider = (query: string, cb: (data: SuggestionOption[]) => void) => {
  void provideSuggestions('origin', query, cb);
};

const destinationSuggestionProvider = (query: string, cb: (data: SuggestionOption[]) => void) => {
  void provideSuggestions('destination', query, cb);
};

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
  if (suggestionAbort.value) {
    suggestionAbort.value.abort();
    suggestionAbort.value = null;
  }
});

function useSuggestionAbortController(): AbortController {
  if (suggestionAbort.value) {
    suggestionAbort.value.abort();
  }
  suggestionAbort.value = new AbortController();
  return suggestionAbort.value;
}

async function provideSuggestions(
  field: 'origin' | 'destination',
  query: string,
  cb: (data: SuggestionOption[]) => void,
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) {
    if (suggestionAbort.value) {
      suggestionAbort.value.abort();
      suggestionAbort.value = null;
    }
    cb([]);
    return;
  }

  const controller = useSuggestionAbortController();
  try {
    const suggestions = await fetchLocationSuggestions(trimmed, {
      location: locationCache[field].coords ?? undefined,
      city: locationCache[field].city ?? locationCache[field].district ?? undefined,
      signal: controller.signal,
    });
    if (suggestionAbort.value !== controller) {
      return;
    }
    const options = suggestions
      .map<SuggestionOption>(suggestion => ({
        ...suggestion,
        value: suggestion.name,
      }))
      .slice(0, 8);
    cb(options);
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') {
      // eslint-disable-next-line no-console
      console.warn('[AMap] 获取地点提示失败：', error);
    }
    if (suggestionAbort.value === controller) {
      cb([]);
    }
  } finally {
    if (suggestionAbort.value === controller) {
      suggestionAbort.value = null;
    }
  }
}

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
    const scaleControl = new AMap.Scale();
    mapInstance.value.addControl(scaleControl);
    const toolBarControl = new AMap.ToolBar({
      position: { right: '20px', top: '40px' },
    });
    mapInstance.value.addControl(toolBarControl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    mapError.value = message;
    ElMessage.error(message);
  } finally {
    isLoadingMap.value = false;
  }
}

function clearRoutes() {
  routeSummary.value = null;
  routeSteps.value = [];
  if (routePolyline.value) {
    routePolyline.value.setMap(null);
    routePolyline.value = null;
  }
}

function handleFieldFocus(field: 'origin' | 'destination') {
  activeField.value = field;
}

function swapLocations() {
  [form.origin, form.destination] = [form.destination, form.origin];
  const originSnapshot = { ...locationCache.origin };
  const destinationSnapshot = { ...locationCache.destination };
  Object.assign(locationCache.origin, destinationSnapshot);
  Object.assign(locationCache.destination, originSnapshot);
}

function handleSuggestionSelect(field: 'origin' | 'destination', option: SuggestionOption) {
  const value = option.value;
  form[field] = value;
  Object.assign(locationCache[field], {
    text: value,
    coords: option.location ?? null,
    city: null,
    province: null,
    district: option.district ?? null,
    adcode: option.adcode ?? null,
  });
}

function handleLocationClear(field: 'origin' | 'destination') {
  Object.assign(locationCache[field], createEmptyLocation());
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
    const [originLocation, destinationLocation] = await Promise.all([
      resolveCoordinates('origin'),
      resolveCoordinates('destination'),
    ]);

    let routeOptions: Parameters<typeof fetchRoute>[3];
    if (navMode.value === 'transit') {
      const originCity = originLocation.city ?? (await ensureCity('origin', originLocation.coords));
      const destinationCity =
        destinationLocation.city ?? (await ensureCity('destination', destinationLocation.coords));
      routeOptions = {
        city: originCity ?? destinationCity ?? undefined,
        destinationCity: destinationCity ?? originCity ?? undefined,
      };
    }

    const route = await fetchRoute(
      navMode.value,
      originLocation.coords,
      destinationLocation.coords,
      routeOptions,
    );
    updateRouteDisplay(navMode.value, route);
    await renderRoutePolyline(route.steps);
  } catch (error) {
    clearRoutes();
    const message = error instanceof Error ? error.message : String(error);
    ElMessage.error(message);
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
    let targetCoords: Coordinates | null = null;
    let ipFallback: Awaited<ReturnType<typeof locateByIP>> | null = null;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        const gpsCoords: Coordinates = [position.coords.longitude, position.coords.latitude];
        try {
          targetCoords = await convertGpsToGcj(gpsCoords);
        } catch (convertError) {
          // eslint-disable-next-line no-console
          console.warn('[AMap] 坐标转换失败，使用原始定位坐标：', convertError);
          targetCoords = gpsCoords;
        }
      } catch (geoError) {
        // eslint-disable-next-line no-console
        console.warn('[AMap] 浏览器定位失败，尝试使用 IP 粗略定位：', geoError);
      }
    }

    if (!targetCoords) {
      const ipLocation = await locateByIP().catch(() => null);
      if (ipLocation?.location) {
        targetCoords = ipLocation.location;
        ipFallback = ipLocation;
      }
    }

    if (!targetCoords) {
      throw new Error('无法获取当前位置，请检查定位权限或网络状态。');
    }

    const map = mapInstance.value;
    if (!map) {
      throw new Error('地图尚未就绪');
    }

    const regeo = await reverseGeocode(targetCoords).catch(() => null);
    const address =
      regeo?.formattedAddress ?? `${targetCoords[0].toFixed(6)},${targetCoords[1].toFixed(6)}`;
    const cityName =
      deriveCityName(regeo?.city ?? null, regeo?.province ?? null, regeo?.district ?? null) ??
      sanitizeAdministrativeName(ipFallback?.city ?? null);
    const provinceName = sanitizeAdministrativeName(
      regeo?.province ?? ipFallback?.province ?? null,
    );
    const districtName = sanitizeAdministrativeName(regeo?.district ?? null);
    const adcodeValue = ipFallback?.adcode ?? null;

    if (activeField.value === 'origin') {
      form.origin = address;
      Object.assign(locationCache.origin, {
        text: address,
        coords: targetCoords,
        city: cityName,
        province: provinceName,
        district: districtName,
        adcode: adcodeValue,
      });
    } else {
      form.destination = address;
      Object.assign(locationCache.destination, {
        text: address,
        coords: targetCoords,
        city: cityName,
        province: provinceName,
        district: districtName,
        adcode: adcodeValue,
      });
    }

    await updateLocationMarker(targetCoords);
    ElMessage.success('已获取当前位置');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    locating.value = false;
  }
}

async function resolveCoordinates(field: 'origin' | 'destination'): Promise<ResolvedLocation> {
  const input = form[field].trim();
  if (!input) {
    throw new Error(field === 'origin' ? '请填写起点信息' : '请填写终点信息');
  }

  const direct = detectCoordinateText(input);
  if (direct) {
    Object.assign(locationCache[field], {
      text: input,
      coords: direct,
    });
    return {
      coords: direct,
      city: locationCache[field].city,
    };
  }

  const cached = locationCache[field];
  if (cached.coords && cached.text === input) {
    return {
      coords: cached.coords,
      city: cached.city,
    };
  }

  const geocode = await geocodeAddress(input);
  if (!geocode?.location) {
    throw new Error('未能解析该地址，请尝试输入更精确的位置');
  }

  const cityName = deriveCityName(
    geocode.city ?? null,
    geocode.province ?? null,
    geocode.district ?? null,
  );

  Object.assign(locationCache[field], {
    text: input,
    coords: geocode.location,
    city: cityName,
    province: geocode.province ?? null,
    district: geocode.district ?? null,
    adcode: geocode.adcode ?? null,
  });

  return {
    coords: geocode.location,
    city: cityName,
  };
}

async function ensureCity(
  field: 'origin' | 'destination',
  coords: Coordinates,
): Promise<string | null> {
  const cached = locationCache[field];
  if (cached.city) {
    return cached.city;
  }
  const regeo = await reverseGeocode(coords).catch(() => null);
  if (regeo) {
    const cityName = deriveCityName(
      regeo.city ?? null,
      regeo.province ?? null,
      regeo.district ?? null,
    );
    if (cityName) {
      cached.city = cityName;
    }
    if (regeo.province) {
      cached.province = regeo.province;
    }
    if (regeo.district) {
      cached.district = regeo.district;
    }
  }
  return cached.city;
}

function updateRouteDisplay(mode: NavMode, route: RouteResult) {
  routeSummary.value = {
    mode,
    distance: route.distance,
    duration: route.duration,
    cost: route.cost,
  };

  routeSteps.value = route.steps.map((step, index) => ({
    instruction: step.instruction || `第 ${index + 1} 段`,
    distance: step.distance,
    duration: step.duration,
    mode: step.mode,
  }));
}

async function renderRoutePolyline(steps: RouteStepResult[]): Promise<void> {
  const map = mapInstance.value;
  if (!map) {
    throw new Error('地图尚未加载完成');
  }

  if (routePolyline.value) {
    routePolyline.value.setMap(null);
    routePolyline.value = null;
  }

  const path: [number, number][] = [];
  steps.forEach(step => {
    step.polyline.forEach(([lng, lat]) => {
      path.push([lng, lat]);
    });
  });

  if (!path.length) {
    return;
  }

  const AMap = await loadAmap();
  routePolyline.value = new AMap.Polyline({
    path,
    showDir: true,
    strokeColor: navMode.value === 'driving' ? '#409EFF' : '#67C23A',
    strokeWeight: 6,
    lineJoin: 'round',
    lineCap: 'round',
  });
  routePolyline.value.setMap(map);
  map.setFitView([routePolyline.value], true, [120, 160, 120, 180]);
}

async function updateLocationMarker(coords: Coordinates): Promise<void> {
  const map = mapInstance.value;
  if (!map) {
    throw new Error('地图尚未加载完成');
  }

  const AMap = await loadAmap();
  if (!locationMarker.value) {
    locationMarker.value = new AMap.Marker({
      map,
      position: coords,
      title: '当前位置',
    });
  } else {
    locationMarker.value.setMap(map);
    locationMarker.value.setPosition(coords);
  }

  map.setZoomAndCenter(14, coords);
}

function formatCost(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '—';
  }
  if (Number.isInteger(amount)) {
    return amount.toFixed(0);
  }
  if (amount < 10) {
    return amount.toFixed(1);
  }
  return amount.toFixed(0);
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
  if (mode === 'driving') {
    return '驾车导航';
  }
  if (mode === 'walking') {
    return '步行导航';
  }
  return '公共交通';
}

function sanitizeAdministrativeName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') {
    return null;
  }
  return trimmed;
}

function deriveCityName(
  city: string | null | undefined,
  province: string | null | undefined,
  district: string | null | undefined,
): string | null {
  const normalizedCity = sanitizeAdministrativeName(city);
  if (normalizedCity) {
    return normalizedCity;
  }
  const normalizedProvince = sanitizeAdministrativeName(province);
  if (normalizedProvince && /市$/.test(normalizedProvince)) {
    return normalizedProvince;
  }
  const normalizedDistrict = sanitizeAdministrativeName(district);
  if (normalizedDistrict) {
    return normalizedDistrict;
  }
  return normalizedProvince;
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

.map-suggestion {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  line-height: 1.3;
}

.map-suggestion__title {
  font-weight: 600;
}

.map-suggestion__meta {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
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
