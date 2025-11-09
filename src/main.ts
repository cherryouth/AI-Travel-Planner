import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/base.css';

const app = createApp(App);
const pinia = createPinia();

dayjs.locale('zh-cn');

app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: zhCn });

const authStore = useAuthStore(pinia);
authStore.init().catch(error => {
  if (import.meta.env.DEV) {
    console.error('初始化 Supabase 认证失败：', error);
  }
});

app.mount('#app');
