import type { TripPlan, TravelPreferences } from './plan';

export interface StoredTripPlan {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number | null;
  currency: string;
  plan: TripPlan;
  diagnostics: string[];
  preferences: TravelPreferences | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreferenceProfile {
  id: string;
  userId: string;
  defaultPace: TravelPreferences['pace'] | null;
  defaultThemes: string[];
  kidFriendly: boolean;
  mustHave: string[];
  homeAirport: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntry {
  id: string;
  planId: string;
  userId: string;
  category: string;
  amount: number;
  currency: string;
  incurredOn: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTripPlanPayload {
  plan: TripPlan;
  diagnostics: string[];
  preferences?: TravelPreferences;
  existingId?: string;
}

export interface UpsertPreferencePayload {
  defaultPace?: TravelPreferences['pace'];
  defaultThemes?: string[];
  kidFriendly?: boolean;
  mustHave?: string[];
  homeAirport?: string | null;
  notes?: string | null;
}

export interface UpsertExpensePayload {
  planId: string;
  category: string;
  amount: number;
  currency: string;
  incurredOn: string;
  notes?: string | null;
  id?: string;
}
