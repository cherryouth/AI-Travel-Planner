import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import {
  deleteExpense,
  deleteTripPlan,
  fetchExpenses,
  fetchPreferenceProfile,
  fetchTripPlans,
  upsertExpense,
  upsertPreferenceProfile,
  upsertTripPlan,
} from '../services/tripStorage';
import type {
  ExpenseEntry,
  PreferenceProfile,
  StoredTripPlan,
  UpsertExpensePayload,
  UpsertPreferencePayload,
} from '../types/storage';
import type { TravelPreferences, TripPlan } from '../types/plan';
import { useAuthStore } from './auth';
import { usePlannerStore } from './planner';

interface PlanLibraryState {
  plans: StoredTripPlan[];
  expenses: Record<string, ExpenseEntry[]>;
  preferenceProfile: PreferenceProfile | null;
  loading: boolean;
  error: string | null;
  loadingExpenses: boolean;
  saving: boolean;
}

interface SavePlanOptions {
  overwritePlanId?: string;
  planResult: {
    plan: TripPlan | null;
    diagnostics: string[];
    rawContent?: string;
  };
  preferences?: TravelPreferences;
}

export const usePlanLibraryStore = defineStore('plan-library', () => {
  const state = reactive<PlanLibraryState>({
    plans: [],
    expenses: {},
    preferenceProfile: null,
    loading: false,
    error: null,
    loadingExpenses: false,
    saving: false,
  });

  const authStore = useAuthStore();
  const plannerStore = usePlannerStore();
  const selectedPlanId = ref<string | null>(null);
  const selectedExpensePlanId = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(authStore.user));
  const selectedPlan = computed(
    () => state.plans.find(item => item.id === selectedPlanId.value) ?? null,
  );
  const activeExpenses = computed(() => {
    if (!selectedExpensePlanId.value) {
      return [] as ExpenseEntry[];
    }
    return state.expenses[selectedExpensePlanId.value] ?? [];
  });

  function ensureUserId(): string {
    const userId = authStore.user?.id;
    if (!userId) {
      throw new Error('请先登录后再同步云端数据。');
    }
    return userId;
  }

  function setError(message: string | null) {
    state.error = message;
  }

  async function loadPlans() {
    setError(null);
    if (!authStore.user) {
      state.plans = [];
      return;
    }
    state.loading = true;
    try {
      const plans = await fetchTripPlans(authStore.user.id);
      state.plans = plans;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      state.loading = false;
    }
  }

  async function savePlan(options: SavePlanOptions) {
    if (!options.planResult.plan) {
      throw new Error('没有可保存的行程内容。');
    }
    const userId = ensureUserId();
    setError(null);
    state.saving = true;
    try {
      const stored = await upsertTripPlan(userId, {
        plan: options.planResult.plan,
        diagnostics: options.planResult.diagnostics,
        preferences: options.preferences,
        existingId: options.overwritePlanId,
      });
      const existingIndex = state.plans.findIndex(item => item.id === stored.id);
      if (existingIndex >= 0) {
        state.plans.splice(existingIndex, 1, stored);
      } else {
        state.plans.unshift(stored);
      }
      selectedPlanId.value = stored.id;
      return stored;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      throw new Error(`保存行程失败：${message}`);
    } finally {
      state.saving = false;
    }
  }

  async function removePlan(planId: string) {
    const userId = ensureUserId();
    setError(null);
    try {
      await deleteTripPlan(userId, planId);
      state.plans = state.plans.filter(item => item.id !== planId);
      if (selectedPlanId.value === planId) {
        selectedPlanId.value = null;
      }
      delete state.expenses[planId];
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function loadPreferenceProfile() {
    if (!authStore.user) {
      state.preferenceProfile = null;
      return null;
    }
    try {
      const profile = await fetchPreferenceProfile(authStore.user.id);
      state.preferenceProfile = profile;
      return profile;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async function savePreferenceProfile(payload: UpsertPreferencePayload) {
    const userId = ensureUserId();
    setError(null);
    try {
      const profile = await upsertPreferenceProfile(userId, payload);
      state.preferenceProfile = profile;
      return profile;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function loadExpenses(planId: string) {
    const userId = ensureUserId();
    setError(null);
    state.loadingExpenses = true;
    try {
      const items = await fetchExpenses(userId, planId);
      state.expenses[planId] = items;
      selectedExpensePlanId.value = planId;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      state.loadingExpenses = false;
    }
  }

  async function saveExpense(payload: UpsertExpensePayload) {
    const userId = ensureUserId();
    setError(null);
    try {
      const entry = await upsertExpense(userId, payload);
      const current = state.expenses[payload.planId] ?? [];
      const idx = current.findIndex(item => item.id === entry.id);
      if (idx >= 0) {
        current.splice(idx, 1, entry);
      } else {
        current.unshift(entry);
      }
      state.expenses[payload.planId] = [...current];
      return entry;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function removeExpense(planId: string, expenseId: string) {
    const userId = ensureUserId();
    setError(null);
    try {
      await deleteExpense(userId, expenseId);
      const current = state.expenses[planId] ?? [];
      state.expenses[planId] = current.filter(item => item.id !== expenseId);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  function applyPlanToWorkspace(plan: StoredTripPlan) {
    selectedPlanId.value = plan.id;
    plannerStore.plan = plan.plan;
    plannerStore.diagnostics = [...(plan.diagnostics ?? [])];
    plannerStore.error = null;
    plannerStore.streamingPreview = '';
    plannerStore.rawHunyuanContent = '';
    plannerStore.form.destination = plan.plan.destination;
    plannerStore.form.startDate = plan.plan.startDate;
    plannerStore.form.endDate = plan.plan.endDate;
    plannerStore.form.travelers = plan.plan.travelers;
    plannerStore.form.budget = plan.plan.budget ?? null;
    if (plan.preferences?.themes && plan.preferences.themes.length > 0) {
      plannerStore.form.preferenceTags = [...plan.preferences.themes];
    }
    if (plan.preferences?.pace) {
      plannerStore.form.pace = plan.preferences.pace;
    }
    if (plan.preferences?.kidFriendly) {
      if (!plannerStore.form.preferenceTags.includes('亲子')) {
        plannerStore.form.preferenceTags.push('亲子');
      }
    }
    if (plan.preferences?.mustHave && plan.preferences.mustHave.length > 0) {
      plannerStore.form.extraNotes = plan.preferences.mustHave.join('\n');
    }
  }

  function selectPlan(planId: string) {
    const plan = state.plans.find(item => item.id === planId);
    if (plan) {
      applyPlanToWorkspace(plan);
    }
  }

  function summarizeBudget(plan: TripPlan | null) {
    if (!plan) {
      return 0;
    }
    return plan.days.reduce((total, day) => total + (day.totalEstimatedCost ?? 0), 0);
  }

  const totalEstimatedBudget = computed(() => summarizeBudget(plannerStore.plan));

  const upcomingTrips = computed(() => {
    const now = dayjs();
    return state.plans
      .filter(plan => dayjs(plan.startDate).isAfter(now.subtract(1, 'day')))
      .sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));
  });

  return {
    state,
    isAuthenticated,
    selectedPlanId,
    selectedPlan,
    activeExpenses,
    totalEstimatedBudget,
    upcomingTrips,
    estimatePlanCost: summarizeBudget,
    loadPlans,
    savePlan,
    removePlan,
    selectPlan,
    loadPreferenceProfile,
    savePreferenceProfile,
    loadExpenses,
    saveExpense,
    removeExpense,
    loadPlannerFromPlan: applyPlanToWorkspace,
  };
});
