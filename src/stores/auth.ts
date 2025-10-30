import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabaseClient';

interface EmailAuthPayload {
  email: string;
  password: string;
}

export const useAuthStore = defineStore('auth', () => {
  const supabase = getSupabaseClient();

  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const initializing = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let unsubscribe: (() => void) | null = null;

  const isAuthenticated = computed(() => Boolean(user.value));

  async function init() {
    if (initializing.value || unsubscribe) {
      return;
    }
    initializing.value = true;

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        error.value = sessionError.message;
      }

      session.value = data.session;
      user.value = data.session?.user ?? null;

      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        session.value = nextSession;
        user.value = nextSession?.user ?? null;
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    } catch (err) {
      if (err instanceof Error) {
        error.value = err.message;
      }
    } finally {
      initializing.value = false;
    }
  }

  function resetError() {
    error.value = null;
  }

  async function signInWithPassword(payload: EmailAuthPayload) {
    resetError();
    loading.value = true;

    const { data: result, error: authError } = await supabase.auth.signInWithPassword(payload);
    loading.value = false;

    if (authError) {
      error.value = authError.message;
      throw authError;
    }

    session.value = result.session;
    user.value = result.session?.user ?? null;
  }

  async function signUpWithPassword(payload: EmailAuthPayload) {
    resetError();
    loading.value = true;

    const { data: result, error: authError } = await supabase.auth.signUp(payload);
    loading.value = false;

    if (authError) {
      error.value = authError.message;
      throw authError;
    }

    session.value = result.session;
    user.value = result.user ?? null;

    return result;
  }

  async function signOut() {
    resetError();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      error.value = signOutError.message;
      throw signOutError;
    }
    session.value = null;
    user.value = null;
  }

  async function signInWithProvider(provider: Provider) {
    resetError();
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider });
    if (authError) {
      error.value = authError.message;
      throw authError;
    }
  }

  return {
    user,
    session,
    initializing,
    loading,
    error,
    isAuthenticated,
    init,
    resetError,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    signInWithProvider,
  };
});
