/// <reference types="vite/client" />
/// <reference types="@amap/amap-jsapi-types" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_HUNYUAN_API_KEY: string;
  readonly VITE_HUNYUAN_ENDPOINT: string;
  readonly VITE_HUNYUAN_T1_SECRET_ID?: string;
  readonly VITE_HUNYUAN_T1_SECRET_KEY?: string;
  readonly VITE_HUNYUAN_T1_ENDPOINT?: string;
  readonly VITE_HUNYUAN_T1_PROXY_ENDPOINT?: string;
  readonly VITE_HUNYUAN_T1_MODEL?: string;
  readonly VITE_HUNYUAN_T1_TEMPERATURE?: string;
  readonly VITE_HUNYUAN_T1_TOP_P?: string;
  readonly VITE_HUNYUAN_T1_REGION?: string;
  readonly VITE_IFLYTEK_APP_ID: string;
  readonly VITE_IFLYTEK_API_KEY: string;
  readonly VITE_IFLYTEK_API_SECRET: string;
  readonly VITE_AMAP_WEB_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
