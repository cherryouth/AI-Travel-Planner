<template>
  <section class="planner">
    <el-page-header content="智能行程规划" class="planner__header">
      <template #extra>
        <el-space>
          <el-tooltip content="解析当前描述并自动填充行程参数" placement="bottom">
            <el-button :disabled="!form.intentText" @click="handleAnalyzeIntent">
              智能解析
            </el-button>
          </el-tooltip>
          <el-button type="primary" :loading="loading" @click="handleSubmit"> 生成行程 </el-button>
          <el-button :disabled="!plan" @click="handleResetPlan">清除结果</el-button>
          <el-button link @click="handleResetForm">重置表单</el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-row :gutter="24" class="planner__content">
      <el-col :lg="10" :md="11" :sm="24" :xs="24">
        <el-card class="planner__card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>出行需求</span>
              <el-tag v-if="tripDays" type="success" size="small">{{ tripDays }} 天</el-tag>
            </div>
          </template>
          <el-form label-width="90px" label-position="top" class="planner-form">
            <el-form-item label="目的地" required>
              <el-input
                v-model="form.destination"
                placeholder="例如：日本东京、云南大理、巴黎"
                maxlength="30"
                clearable
              />
            </el-form-item>

            <el-form-item label="行程日期" required>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                unlink-panels
                :disabled-date="disabledPast"
                clearable
              />
            </el-form-item>

            <el-form-item label="预算 (元)">
              <el-input-number
                v-model="form.budget"
                :min="0"
                :step="500"
                :controls="false"
                placeholder="例如：10000"
              />
            </el-form-item>

            <el-form-item label="同行人数" required>
              <el-input-number v-model="form.travelers" :min="1" />
            </el-form-item>

            <el-form-item label="旅行节奏">
              <el-radio-group v-model="form.pace">
                <el-radio-button label="relaxed">轻松</el-radio-button>
                <el-radio-button label="balanced">均衡</el-radio-button>
                <el-radio-button label="intensive">紧凑</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="偏好主题">
              <el-select
                v-model="form.preferenceTags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入旅行偏好"
              >
                <el-option
                  v-for="option in plannerStore.preferenceTagOptions"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="额外备注">
              <el-input
                v-model="form.extraNotes"
                type="textarea"
                :rows="3"
                placeholder="想去的具体景点、饮食忌口、酒店偏好等"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="planner__card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>语音 / 文本需求描述</span>
              <el-space>
                <el-button
                  size="small"
                  :type="isListening ? 'danger' : 'primary'"
                  :plain="isListening"
                  @click="toggleVoice"
                >
                  <template #icon>
                    <el-icon v-if="isListening"><VideoPause /></el-icon>
                    <el-icon v-else><Microphone /></el-icon>
                  </template>
                  {{ isListening ? '停止识别' : '语音输入' }}
                </el-button>
                <el-tag v-if="voiceLiveText" type="info" size="small">实时识别中</el-tag>
              </el-space>
            </div>
          </template>

          <el-alert
            v-if="voiceError"
            type="error"
            :closable="false"
            class="planner__alert"
            show-icon
            title="语音识别出现问题：{{ voiceError }}"
          />

          <el-input
            v-model="form.intentText"
            type="textarea"
            :rows="6"
            maxlength="400"
            show-word-limit
            placeholder="语音或手动输入：例如“我想去日本东京，5 天，预算一万元，喜欢美食和动漫，带孩子”"
          />

          <section v-if="parseLogs.length" class="planner__logs">
            <h4>智能解析记录</h4>
            <ul>
              <li v-for="(log, index) in parseLogs" :key="`${log}-${index}`">{{ log }}</li>
            </ul>
          </section>

          <section v-if="voiceLiveText" class="planner__voice-preview">
            <h4>实时识别</h4>
            <p>{{ voiceLiveText }}</p>
          </section>

          <section v-if="voiceFinalText" class="planner__voice-preview">
            <h4>最新语音结果</h4>
            <p>{{ voiceFinalText }}</p>
          </section>
        </el-card>
      </el-col>

      <el-col :lg="14" :md="13" :sm="24" :xs="24">
        <el-card class="planner__card planner__card--result" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>行程规划结果</span>
              <el-tag v-if="plan" type="success" effect="dark">已生成</el-tag>
            </div>
          </template>

          <el-empty v-if="!plan && !loading" description="尚未生成行程，先填写需求吧" />

          <el-skeleton v-else-if="loading" :rows="6" animated />

          <div v-else class="plan-result">
            <header class="plan-result__header">
              <div>
                <h2>{{ plan?.title }}</h2>
                <p>
                  目的地：{{ plan?.destination }} · 日期：{{ plan?.startDate }} 至
                  {{ plan?.endDate }} · 同行人数：{{ plan?.travelers }} 人
                </p>
              </div>
              <div class="plan-result__meta">
                <el-statistic title="预算 (元)" :value="plan?.budget ?? 0" :precision="0" />
              </div>
            </header>

            <el-alert
              v-if="diagnostics.length"
              title="规划说明"
              type="info"
              :closable="false"
              class="planner__alert"
            >
              <ul>
                <li v-for="(item, index) in diagnostics" :key="`${item}-${index}`">{{ item }}</li>
              </ul>
            </el-alert>

            <el-collapse accordion>
              <el-collapse-item v-for="day in plan?.days ?? []" :key="day.id" :name="day.id">
                <template #title>
                  <div class="plan-day-title">
                    <strong>{{ day.date }}</strong>
                    <span>{{ day.summary }}</span>
                    <el-tag size="small" effect="plain" type="warning">
                      预计 {{ day.totalEstimatedCost?.toFixed(0) }} 元
                    </el-tag>
                  </div>
                </template>

                <el-timeline>
                  <el-timeline-item
                    v-for="item in day.items"
                    :key="item.id"
                    :timestamp="formatTimeRange(item.startTime, item.endTime)"
                    placement="top"
                    :type="timelineType(item.type)"
                    :icon="timelineIcon(item.type)"
                  >
                    <div class="plan-item">
                      <h4>{{ item.title }}</h4>
                      <p v-if="item.notes" class="plan-item__notes">{{ item.notes }}</p>
                      <p v-if="item.estimatedCost" class="plan-item__cost">
                        预计费用：{{ item.estimatedCost.toFixed(0) }} 元
                      </p>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      class="planner__alert planner__alert--footer"
      show-icon
      :title="error"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import {
  Microphone,
  VideoPause,
  Food,
  Suitcase,
  CoffeeCup,
  LocationFilled,
  House,
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { usePlannerStore } from '../stores/planner';
import type { DayItemType } from '../types/plan';

const plannerStore = usePlannerStore();
const {
  form,
  plan,
  loading,
  error,
  diagnostics,
  tripDays,
  voiceLiveText,
  voiceFinalText,
  voiceError,
  isListening,
  parseLogs,
} = storeToRefs(plannerStore);

const dateRange = computed({
  get: () => {
    if (!form.value.startDate || !form.value.endDate) {
      return [];
    }
    return [form.value.startDate, form.value.endDate];
  },
  set: value => {
    if (!value || value.length === 0) {
      form.value.startDate = '';
      form.value.endDate = '';
    } else if (value.length === 2) {
      form.value.startDate = value[0];
      form.value.endDate = value[1];
    }
  },
});

function disabledPast(date: Date) {
  return dayjs(date).isBefore(dayjs().startOf('day'));
}

function formatTimeRange(start?: string, end?: string) {
  if (!start && !end) {
    return '全天';
  }
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start ?? end ?? '';
}

function timelineIcon(type: DayItemType) {
  switch (type) {
    case 'meal':
      return Food;
    case 'transport':
      return Suitcase;
    case 'hotel':
      return House;
    case 'attraction':
      return LocationFilled;
    default:
      return CoffeeCup;
  }
}

function timelineType(type: DayItemType): 'primary' | 'success' | 'warning' | 'info' {
  switch (type) {
    case 'meal':
      return 'primary';
    case 'hotel':
      return 'info';
    case 'transport':
      return 'success';
    case 'attraction':
      return 'warning';
    default:
      return 'info';
  }
}

async function toggleVoice() {
  if (isListening.value) {
    await plannerStore.stopVoiceInput();
  } else {
    await plannerStore.startVoiceInput();
  }
}

async function handleSubmit() {
  await plannerStore.submitPlan();
}

function handleResetPlan() {
  plannerStore.resetPlan();
}

function handleResetForm() {
  plannerStore.resetForm();
}

function handleAnalyzeIntent() {
  plannerStore.analyzeIntent();
}

onBeforeUnmount(() => {
  void plannerStore.teardown();
});
</script>

<style scoped>
.planner {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.planner__header {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 0.75rem;
}

.planner__content {
  align-items: stretch;
}

.planner__card {
  margin-bottom: 1rem;
}

.planner__card--result {
  min-height: 560px;
}

.planner-form {
  display: grid;
  gap: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.planner__logs {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.planner__logs ul {
  margin: 0;
  padding-left: 1.25rem;
  color: #606266;
  font-size: 0.9rem;
  line-height: 1.6;
}

.planner__voice-preview {
  margin-top: 1rem;
  padding: 0.75rem;
  border-left: 4px solid #409eff;
  background: rgba(64, 158, 255, 0.06);
  border-radius: 4px;
}

.planner__voice-preview p {
  margin: 0.25rem 0 0;
  color: #303133;
}

.plan-result__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.plan-result__header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  color: #303133;
}

.plan-result__header p {
  margin: 0;
  color: #606266;
  font-size: 0.95rem;
}

.plan-result__meta {
  display: flex;
  gap: 1rem;
}

.planner__alert {
  margin-top: 1rem;
}

.planner__alert--footer {
  margin-bottom: 1rem;
}

.plan-day-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.plan-day-title strong {
  font-size: 1rem;
}

.plan-day-title span {
  flex: 1;
  color: #606266;
}

.plan-item h4 {
  margin: 0;
  font-size: 1.05rem;
  color: #303133;
}

.plan-item__notes {
  margin: 0.5rem 0 0;
  color: #606266;
}

.plan-item__cost {
  margin: 0.25rem 0 0;
  color: #909399;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .planner__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .plan-result__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .planner__card {
    margin-bottom: 1.5rem;
  }
}
</style>
