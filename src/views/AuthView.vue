<template>
  <div class="auth">
    <el-card class="auth__card" shadow="hover">
      <div class="auth__header">
        <h2>{{ modeTitle }}</h2>
        <p>{{ modeSubtitle }}</p>
      </div>

      <el-alert
        v-if="authStore.error"
        type="error"
        :closable="false"
        class="auth__alert"
        :title="authStore.error"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="you@example.com" autocomplete="email" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入至少 6 位密码"
            autocomplete="current-password"
            show-password
          />
        </el-form-item>
      </el-form>

      <div class="auth__actions">
        <el-button type="primary" size="large" :loading="authStore.loading" @click="handleSubmit">
          {{ submitLabel }}
        </el-button>
        <el-button size="large" link @click="toggleMode">
          {{ toggleLabel }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const formRef = ref<FormInstance>();

const form = reactive({
  email: '',
  password: '',
});

const mode = ref<'sign-in' | 'sign-up'>('sign-in');

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
};

const modeTitle = computed(() => (mode.value === 'sign-in' ? '欢迎回来' : '创建账户'));
const modeSubtitle = computed(() =>
  mode.value === 'sign-in' ? '登录以继续规划行程与同步云端数据' : '注册后即可保存行程并与团队协作',
);
const submitLabel = computed(() => (mode.value === 'sign-in' ? '登录' : '注册'));
const toggleLabel = computed(() =>
  mode.value === 'sign-in' ? '没有账号？立即注册' : '已有账号？直接登录',
);

watch(
  () => authStore.isAuthenticated,
  loggedIn => {
    if (loggedIn) {
      const redirect = (route.query.redirect as string) || '/';
      router.replace(redirect);
    }
  },
  { immediate: true },
);

function toggleMode() {
  mode.value = mode.value === 'sign-in' ? 'sign-up' : 'sign-in';
  authStore.resetError();
}

async function handleSubmit() {
  if (!formRef.value) {
    return;
  }

  try {
    await formRef.value.validate();

    if (mode.value === 'sign-in') {
      await authStore.signInWithPassword({ ...form });
    } else {
      await authStore.signUpWithPassword({ ...form });
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.debug('处理认证请求时捕获异常', err);
    }
  }
}
</script>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: radial-gradient(circle at top, #ecf5ff, #f5f7fa);
}

.auth__card {
  width: min(420px, 90vw);
  display: grid;
  gap: 1.5rem;
}

.auth__header h2 {
  margin-bottom: 0.25rem;
  color: #303133;
  font-size: 1.75rem;
}

.auth__header p {
  color: #606266;
}

.auth__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth__alert {
  margin-bottom: 0.5rem;
}
</style>
