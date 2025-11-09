import AMapLoader from '@amap/amap-jsapi-loader';

type AMapStatic = typeof globalThis extends { AMap: infer T } ? T : unknown;

let loaderPromise: Promise<AMapStatic> | null = null;

const DEFAULT_PLUGINS = [
  'AMap.Scale',
  'AMap.ToolBar',
  'AMap.Geolocation',
  'AMap.Driving',
  'AMap.Walking',
];

export async function loadAmap(): Promise<AMapStatic> {
  if (loaderPromise) {
    return loaderPromise;
  }

  const key = import.meta.env.VITE_AMAP_WEB_KEY;
  if (!key) {
    throw new Error('缺少 VITE_AMAP_WEB_KEY 环境变量，无法加载高德地图 SDK。');
  }

  loaderPromise = AMapLoader.load({
    key,
    version: '2.0',
    plugins: DEFAULT_PLUGINS,
    Loca: {
      version: '2.0.0',
    },
  });

  return loaderPromise;
}

export function resetAmapLoader(): void {
  loaderPromise = null;
}
