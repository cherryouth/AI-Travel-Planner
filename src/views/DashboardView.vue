<template>
  <section class="dashboard">
    <el-page-header content="概览" />

    <section class="hero">
      <h1>规划旅行，从一段对话开始</h1>
      <p>通过语音或文字告知旅行梦想，AI 将即时生成个性化行程，涵盖交通、住宿、景点与预算。</p>
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
  </section>
</template>

<script setup lang="ts">
import { Position, Promotion, TrendCharts } from '@element-plus/icons-vue';
</script>

<style scoped>
.dashboard {
  display: grid;
  gap: 1.5rem;
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

.feature-grid {
  margin-top: 1rem;
}

.feature-card {
  min-height: 200px;
  display: grid;
  gap: 0.75rem;
}

.feature-card__icon {
  color: #409eff;
}
</style>
