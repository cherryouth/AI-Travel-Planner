<template>
  <el-container class="layout">
    <el-header class="layout__header">
      <div class="brand">
        <el-icon size="28">
          <Compass />
        </el-icon>
        <span class="brand__title">AI 旅游规划器</span>
      </div>
      <el-button type="primary" size="large">开始规划行程</el-button>
    </el-header>

    <el-container>
      <el-aside width="240px" class="layout__aside">
        <el-menu class="menu" default-active="planner">
          <el-menu-item index="planner">
            <el-icon><Guide /></el-icon>
            <span>智能行程</span>
          </el-menu-item>
          <el-menu-item index="budget">
            <el-icon><Coin /></el-icon>
            <span>费用管理</span>
          </el-menu-item>
          <el-menu-item index="map">
            <el-icon><MapLocation /></el-icon>
            <span>地图导航</span>
          </el-menu-item>
          <el-menu-item index="profile">
            <el-icon><UserFilled /></el-icon>
            <span>账户与偏好</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="layout__main">
        <section class="hero">
          <h1>规划旅行，从一段对话开始</h1>
          <p>
            通过语音或文字告知旅行梦想，AI 将即时生成个性化行程，涵盖交通、住宿、景点与预算。
          </p>
          <div class="hero__actions">
            <el-button type="primary" size="large">新建旅行计划</el-button>
            <el-button size="large" plain>导入已有行程</el-button>
          </div>
        </section>

        <el-row :gutter="24" class="feature-grid">
          <el-col :xs="24" :sm="12" :lg="8">
            <el-card shadow="hover" class="feature-card">
              <el-icon size="28" class="feature-card__icon">
                <Promotion />
              </el-icon>
              <h3>智能行程生成</h3>
              <p>基于 Hunyuan-T1 的行程规划能力，快速生成多日行程方案。</p>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="8">
            <el-card shadow="hover" class="feature-card">
              <el-icon size="28" class="feature-card__icon">
                <TrendCharts />
              </el-icon>
              <h3>实时预算管理</h3>
              <p>自动整理预算与消费数据，超支提醒与多维度统计一应俱全。</p>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="8">
            <el-card shadow="hover" class="feature-card">
              <el-icon size="28" class="feature-card__icon">
                <Position />
              </el-icon>
              <h3>地图导航与协作</h3>
              <p>整合高德地图与 Supabase，同步行程、共享路线，旅途中随时调整。</p>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import {
  Coin,
  Compass,
  Guide,
  MapLocation,
  Position,
  Promotion,
  TrendCharts,
  UserFilled,
} from '@element-plus/icons-vue';
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

.hero {
  display: grid;
  gap: 1rem;
  padding: 2rem;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(31, 45, 61, 0.08);
}

.hero h1 {
  font-size: 2rem;
  color: #1f2d3d;
}

.hero p {
  font-size: 1rem;
  color: #606266;
  line-height: 1.6;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.feature-grid {
  margin-top: 2rem;
}

.feature-card {
  min-height: 200px;
  display: grid;
  gap: 0.75rem;
}

.feature-card__icon {
  color: #409eff;
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
