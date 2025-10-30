<template>
  <router-view v-if="isAuthRoute" />
  <el-container v-else class="layout">
    <el-header class="layout__header">
      <div class="brand" @click="goHome">
        <el-icon size="28">
          <Compass />
        </el-icon>
        <span class="brand__title">AI 旅游规划器</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="large" @click="goToPlanner"> 开始规划行程 </el-button>
        <el-divider direction="vertical" class="header-actions__divider" />
        <template v-if="isAuthenticated">
          <el-dropdown trigger="click" @command="handleAccountCommand">
            <span class="user-chip">
              <el-avatar :size="32">
                {{ userInitials }}
              </el-avatar>
              <span class="user-chip__label">{{ userEmail }}</span>
              <el-icon class="user-chip__arrow"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><UserFilled /></el-icon>
                  <span>账户设置</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="sign-out">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <el-button type="primary" link @click="goToLogin">登录 / 注册</el-button>
        </template>
      </div>
    </el-header>

    <el-container>
      <el-aside width="240px" class="layout__aside">
        <el-menu class="menu" :default-active="activeMenu" @select="handleSelect">
          <el-menu-item v-for="item in menuItems" :key="item.name" :index="item.name">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="layout__main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowDown,
  Coin,
  Compass,
  Guide,
  MapLocation,
  SwitchButton,
  UserFilled,
} from '@element-plus/icons-vue';
import { useAuthStore } from './stores/auth';

interface MenuItem {
  name: string;
  label: string;
  path: string;
  icon: Component;
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { user, isAuthenticated } = storeToRefs(authStore);

const menuItems: MenuItem[] = [
  { name: 'dashboard', label: '总览', path: '/', icon: Guide },
  { name: 'planner', label: '智能行程', path: '/planner', icon: MapLocation },
  { name: 'budget', label: '费用管理', path: '/budget', icon: Coin },
  { name: 'map', label: '地图导航', path: '/map', icon: MapLocation },
  { name: 'profile', label: '账户与偏好', path: '/profile', icon: UserFilled },
];

const activeMenu = computed(() => (route.name as string) ?? 'dashboard');

const isAuthRoute = computed(() => route.name === 'auth-login');

const userEmail = computed(() => user.value?.email ?? '未登录');
const userInitials = computed(() => {
  const email = user.value?.email ?? '';
  if (!email) return 'AI';
  return (
    email
      .split('@')[0]
      .split(/\W+/)
      .map(segment => segment.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'AI'
  );
});

const handleSelect = (name: string) => {
  const item = menuItems.find(entry => entry.name === name);
  if (!item) {
    return;
  }
  if (route.path !== item.path) {
    router.push(item.path);
  }
};

const goToPlanner = () => {
  router.push('/planner');
};

const goHome = () => {
  router.push('/');
};

const goToLogin = () => {
  router.push({ name: 'auth-login', query: { redirect: route.fullPath } });
};

const handleAccountCommand = async (command: 'profile' | 'sign-out') => {
  if (command === 'profile') {
    router.push('/profile');
    return;
  }

  try {
    await authStore.signOut();
    router.replace({ name: 'auth-login' });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('退出登录失败：', err);
    }
  }
};
</script>

<style scoped>
.layout {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #ffffff;
  border-bottom: 1px solid #ebeef5;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
}

.brand__title {
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-actions__divider {
  height: 22px;
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #303133;
}

.user-chip__label {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chip__arrow {
  color: #909399;
}

.layout__aside {
  background-color: #ffffff;
  border-right: 1px solid #ebeef5;
}

.menu {
  border-right: none;
}

.layout__main {
  padding: 2rem;
}

@media (max-width: 768px) {
  .layout__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .layout__aside {
    display: none;
  }

  .layout__main {
    padding: 1.5rem;
  }
}
</style>
