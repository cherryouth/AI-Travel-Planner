<template>
  <section class="budget">
    <el-page-header content="费用管理" />

    <el-alert
      v-if="!isAuthenticated"
      type="warning"
      :closable="false"
      show-icon
      title="登录后即可在云端同步并管理行程费用"
    />

    <section v-else class="budget__content">
      <el-card class="budget__card" shadow="hover">
        <el-form label-width="100px" inline class="budget__selector">
          <el-form-item label="选择行程">
            <el-select
              v-model="selectedPlanId"
              placeholder="请选择需要管理的行程"
              style="min-width: 260px"
              :loading="planLibraryStore.state.loading"
              @change="handlePlanChange"
            >
              <el-option
                v-for="plan in planLibraryStore.state.plans"
                :key="plan.id"
                :label="`${plan.title} · ${plan.destination}`"
                :value="plan.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button link :loading="planLibraryStore.state.loading" @click="refreshPlans">
              刷新
            </el-button>
          </el-form-item>
        </el-form>

        <el-alert
          v-if="planLibraryStore.state.error"
          type="error"
          :closable="false"
          show-icon
          class="budget__alert"
          :title="planLibraryStore.state.error"
        />

        <el-empty
          v-if="planLibraryStore.state.plans.length === 0 && !planLibraryStore.state.loading"
          description="暂无已保存的行程，先前往规划页生成并保存吧"
        />

        <template v-else>
          <div class="budget__summary">
            <el-statistic
              title="行程预算 (元)"
              :value="currentPlan?.plan?.budget ?? 0"
              :formatter="currencyFormatter"
            />
            <el-statistic
              title="AI 估算总费用 (元)"
              :value="aiEstimatedTotal"
              :formatter="currencyFormatter"
            />
            <el-statistic
              title="记录消费总额 (元)"
              :value="expenseTotal"
              :formatter="currencyFormatter"
              class="budget__stat--primary"
            />
          </div>

          <el-divider>消费记录</el-divider>

          <el-table
            v-loading="planLibraryStore.state.loadingExpenses"
            :data="planLibraryStore.activeExpenses"
            height="320"
            border
            size="small"
          >
            <el-table-column prop="incurredOn" label="日期" width="120" />
            <el-table-column prop="category" label="类别" width="120" />
            <el-table-column label="金额 (元)" width="140">
              <template #default="scope">
                {{ scope.row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="160">
              <template #default="scope">
                <el-space>
                  <el-button size="small" type="primary" @click="handleEditExpense(scope.row)">
                    编辑
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    plain
                    @click="handleDeleteExpense(scope.row)"
                  >
                    删除
                  </el-button>
                </el-space>
              </template>
            </el-table-column>
          </el-table>

          <el-divider>新增 / 编辑消费</el-divider>

          <el-form label-width="100px" :model="expenseForm" class="budget__form" inline>
            <el-form-item label="日期">
              <el-date-picker
                v-model="expenseForm.incurredOn"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="类别">
              <el-select
                v-model="expenseForm.category"
                placeholder="选择类别"
                style="min-width: 140px"
              >
                <el-option
                  v-for="item in expenseCategories"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="金额 (元)">
              <el-input-number v-model="expenseForm.amount" :min="0" :step="50" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="expenseForm.notes" placeholder="可选" maxlength="80" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="!selectedPlanId" @click="handleSubmitExpense">
                {{ editingExpenseId ? '更新消费' : '新增消费' }}
              </el-button>
              <el-button link :disabled="!editingExpenseId" @click="resetExpenseForm"
                >取消编辑</el-button
              >
            </el-form-item>
          </el-form>
        </template>
      </el-card>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { storeToRefs } from 'pinia';
import dayjs from 'dayjs';
import { usePlanLibraryStore } from '../stores/planLibrary';
import { useAuthStore } from '../stores/auth';
import type { ExpenseEntry } from '../types/storage';

const planLibraryStore = usePlanLibraryStore();
const authStore = useAuthStore();
const { isAuthenticated, user } = storeToRefs(authStore);

const selectedPlanId = ref<string>('');
const editingExpenseId = ref<string | null>(null);
const expenseCategories = ['交通', '住宿', '门票', '餐饮', '购物', '其他'];

const expenseForm = reactive({
  incurredOn: dayjs().format('YYYY-MM-DD'),
  category: expenseCategories[0],
  amount: 0,
  notes: '',
});

const expenseTotal = computed(() =>
  planLibraryStore.activeExpenses.reduce((sum, entry) => sum + entry.amount, 0),
);

const currentPlan = computed(
  () => planLibraryStore.state.plans.find(plan => plan.id === selectedPlanId.value) ?? null,
);

const aiEstimatedTotal = computed(() =>
  planLibraryStore.estimatePlanCost(currentPlan.value?.plan ?? null),
);

function currencyFormatter(value: number) {
  return value.toFixed(2);
}

async function refreshPlans() {
  try {
    await planLibraryStore.loadPlans();
    if (selectedPlanId.value) {
      await planLibraryStore.loadExpenses(selectedPlanId.value);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handlePlanChange(planId: string) {
  if (!planId) {
    return;
  }
  try {
    await planLibraryStore.loadExpenses(planId);
    resetExpenseForm();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function resetExpenseForm() {
  editingExpenseId.value = null;
  expenseForm.incurredOn = dayjs().format('YYYY-MM-DD');
  expenseForm.category = expenseCategories[0];
  expenseForm.amount = 0;
  expenseForm.notes = '';
}

function fillExpenseForm(entry: ExpenseEntry) {
  editingExpenseId.value = entry.id;
  expenseForm.incurredOn = entry.incurredOn;
  expenseForm.category = entry.category;
  expenseForm.amount = entry.amount;
  expenseForm.notes = entry.notes ?? '';
}

async function handleSubmitExpense() {
  if (!selectedPlanId.value) {
    ElMessage.warning('请先选择需要记录费用的行程。');
    return;
  }
  if (expenseForm.amount <= 0) {
    ElMessage.warning('请填写大于 0 的金额。');
    return;
  }

  try {
    await planLibraryStore.saveExpense({
      id: editingExpenseId.value ?? undefined,
      planId: selectedPlanId.value,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      currency: 'CNY',
      incurredOn: expenseForm.incurredOn,
      notes: expenseForm.notes || null,
    });
    ElMessage.success(editingExpenseId.value ? '消费记录已更新' : '消费记录已添加');
    resetExpenseForm();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function handleEditExpense(entry: ExpenseEntry) {
  fillExpenseForm(entry);
}

async function handleDeleteExpense(entry: ExpenseEntry) {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${entry.category} · ${entry.amount.toFixed(2)} 元？`,
      '删除消费',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    await planLibraryStore.removeExpense(entry.planId, entry.id);
    ElMessage.success('已删除消费记录');
    if (editingExpenseId.value === entry.id) {
      resetExpenseForm();
    }
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error(err instanceof Error ? err.message : String(err));
    }
  }
}

watch(
  () => planLibraryStore.state.plans,
  plans => {
    if (!selectedPlanId.value && plans.length > 0) {
      selectedPlanId.value = plans[0].id;
      void handlePlanChange(selectedPlanId.value);
    }
  },
  { immediate: true },
);

watch(
  user,
  value => {
    if (value) {
      void refreshPlans();
    } else {
      selectedPlanId.value = '';
      resetExpenseForm();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (isAuthenticated.value) {
    void refreshPlans();
  }
});
</script>

<style scoped>
.budget {
  display: grid;
  gap: 1.5rem;
}

.budget__content {
  display: grid;
  gap: 1.5rem;
}

.budget__card {
  display: grid;
  gap: 1.5rem;
}

.budget__alert {
  margin-bottom: 1rem;
}

.budget__selector {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.budget__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}

.budget__stat--primary :deep(.el-statistic__number) {
  color: #409eff;
}

.budget__form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .budget__summary {
    grid-template-columns: 1fr;
  }
}
</style>
