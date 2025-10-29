<template>
  <el-container class="layout">
    <el-header class="layout__header">
      <div class="brand">
        <el-icon size="28">
          <Compass />
        </el-icon>
        <span class="brand__title">AI 旅游规划器</span>
      </div>
      <el-button type="primary" size="large" @click="goToPlanner">
        开始规划行程
      </el-button>
    </el-header>

    <el-container>
      <el-aside width="240px" class="layout__aside">
        <el-menu
          class="menu"
          :default-active="activeMenu"
          @select="handleSelect"
        >
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
import { useRoute, useRouter } from 'vue-router';
import {
  Coin,
  Compass,
  Guide,
  MapLocation,
  UserFilled,
} from '@element-plus/icons-vue';

interface MenuItem {
  name: string;
  label: string;
  path: string;
  icon: Component;
}

const router = useRouter();
const route = useRoute();

const menuItems: MenuItem[] = [
  { name: 'dashboard', label: '总览', path: '/', icon: Guide },
  { name: 'planner', label: '智能行程', path: '/planner', icon: MapLocation },
  { name: 'budget', label: '费用管理', path: '/budget', icon: Coin },
  { name: 'map', label: '地图导航', path: '/map', icon: MapLocation },
  { name: 'profile', label: '账户与偏好', path: '/profile', icon: UserFilled },
];

const activeMenu = computed(() => (route.name as string) ?? 'dashboard');

const handleSelect = (name: string) => {
  const item = menuItems.find((entry) => entry.name === name);
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
}

.brand__title {
  color: #303133;
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
