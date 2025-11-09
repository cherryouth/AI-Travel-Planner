import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const proxyTarget = process.env.VITE_HUNYUAN_PROXY_TARGET || 'http://localhost:8787';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/hunyuan': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
