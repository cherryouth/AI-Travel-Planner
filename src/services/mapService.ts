interface MapInitOptions {
  containerId: string;
  center?: [number, number];
  zoom?: number;
}

export function loadGaodeScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (document.querySelector('script[data-amap]')) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`;
    script.async = true;
    script.dataset.amap = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.body.append(script);
  });
}

export async function initMap(options: MapInitOptions) {
  if (typeof window === 'undefined') {
    return null;
  }

  await loadGaodeScript(import.meta.env.VITE_AMAP_WEB_KEY ?? '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AMap = (window as any).AMap;
  if (!AMap) {
    console.warn('AMap SDK 未加载成功。');
    return null;
  }

  const map = new AMap.Map(options.containerId, {
    zoom: options.zoom ?? 12,
    center: options.center ?? [116.397428, 39.90923],
  });

  return map;
}
