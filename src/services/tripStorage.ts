import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import type {
  ExpenseEntry,
  PreferenceProfile,
  StoredTripPlan,
  UpsertExpensePayload,
  UpsertPreferencePayload,
  UpsertTripPlanPayload,
} from '../types/storage';
import type { TravelPreferences, TripPlan } from '../types/plan';

interface TripPlanRow {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  travelers: number | null;
  budget: number | null;
  currency: string | null;
  plan: TripPlan | null;
  diagnostics: string[] | null;
  preferences: TravelPreferences | null;
  created_at: string;
  updated_at: string;
}

interface PreferenceRow {
  id: string;
  user_id: string;
  default_pace: TravelPreferences['pace'] | null;
  default_themes: string[] | null;
  kid_friendly: boolean | null;
  must_have: string[] | null;
  home_airport: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseRow {
  id: string;
  plan_id: string;
  user_id: string;
  category: string;
  amount: number | null;
  currency: string | null;
  incurred_on: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE_TRIP_PLANS = 'trip_plans';
const TABLE_PREFERENCES = 'preference_profiles';
const TABLE_EXPENSES = 'plan_expenses';

function mapTripPlanRow(row: TripPlanRow): StoredTripPlan {
  const plan = (row.plan ?? {}) as TripPlan;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    travelers: row.travelers ?? 1,
    budget: row.budget === null ? null : Number(row.budget),
    currency: row.currency ?? 'CNY',
    plan,
    diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
    preferences: row.preferences ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPreferenceRow(row: PreferenceRow): PreferenceProfile {
  return {
    id: row.id,
    userId: row.user_id,
    defaultPace: row.default_pace ?? null,
    defaultThemes: Array.isArray(row.default_themes) ? row.default_themes : [],
    kidFriendly: Boolean(row.kid_friendly),
    mustHave: Array.isArray(row.must_have) ? row.must_have : [],
    homeAirport: row.home_airport ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExpenseRow(row: ExpenseRow): ExpenseEntry {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    category: row.category,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? 'CNY',
    incurredOn: row.incurred_on,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureClient(): SupabaseClient {
  return getSupabaseClient();
}

export async function fetchTripPlans(userId: string): Promise<StoredTripPlan[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from(TABLE_TRIP_PLANS)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTripPlanRow);
}

export async function upsertTripPlan(
  userId: string,
  payload: UpsertTripPlanPayload,
): Promise<StoredTripPlan> {
  const client = ensureClient();
  const input = {
    id: payload.existingId ?? undefined,
    user_id: userId,
    title: payload.plan.title,
    destination: payload.plan.destination,
    start_date: payload.plan.startDate,
    end_date: payload.plan.endDate,
    travelers: payload.plan.travelers,
    budget: payload.plan.budget ?? null,
    currency: payload.plan.currency ?? 'CNY',
    plan: payload.plan,
    diagnostics: payload.diagnostics ?? [],
    preferences: payload.preferences ?? null,
  };

  const response = await client
    .from(TABLE_TRIP_PLANS)
    .upsert(input, { onConflict: 'id' })
    .select()
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? '保存行程失败');
  }

  return mapTripPlanRow(response.data);
}

export async function deleteTripPlan(userId: string, planId: string): Promise<void> {
  const client = ensureClient();
  const { error } = await client
    .from(TABLE_TRIP_PLANS)
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchPreferenceProfile(userId: string): Promise<PreferenceProfile | null> {
  const client = ensureClient();
  const { data, error } = await client
    .from(TABLE_PREFERENCES)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPreferenceRow(data) : null;
}

export async function upsertPreferenceProfile(
  userId: string,
  payload: UpsertPreferencePayload,
): Promise<PreferenceProfile> {
  const client = ensureClient();
  const response = await client
    .from(TABLE_PREFERENCES)
    .upsert(
      {
        user_id: userId,
        default_pace: payload.defaultPace ?? null,
        default_themes: payload.defaultThemes ?? [],
        kid_friendly: payload.kidFriendly ?? false,
        must_have: payload.mustHave ?? [],
        home_airport: payload.homeAirport ?? null,
        notes: payload.notes ?? null,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? '保存偏好失败');
  }

  return mapPreferenceRow(response.data);
}

export async function fetchExpenses(userId: string, planId: string): Promise<ExpenseEntry[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from(TABLE_EXPENSES)
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .order('incurred_on', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapExpenseRow);
}

export async function upsertExpense(
  userId: string,
  payload: UpsertExpensePayload,
): Promise<ExpenseEntry> {
  const client = ensureClient();
  const response = await client
    .from(TABLE_EXPENSES)
    .upsert(
      {
        id: payload.id ?? undefined,
        user_id: userId,
        plan_id: payload.planId,
        category: payload.category,
        amount: payload.amount,
        currency: payload.currency,
        incurred_on: payload.incurredOn,
        notes: payload.notes ?? null,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? '保存消费失败');
  }

  return mapExpenseRow(response.data);
}

export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  const client = ensureClient();
  const { error } = await client
    .from(TABLE_EXPENSES)
    .delete()
    .eq('id', expenseId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
