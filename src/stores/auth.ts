import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Provider, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../services/supabaseClient';

interface EmailAuthPayload {
  email: string;
  password: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const initializing = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let unsubscribe: (() => void) | null = null;

  const isAuthenticated = computed(() => Boolean(user.value));

  function ensureClient(): SupabaseClient | null {
    try {
      return getSupabaseClient();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Supabase 客户端初始化失败，请检查环境变量配置';
      error.value = message;

      if (import.meta.env.DEV) {
        console.error('Supabase 客户端创建失败：', err);
      }

      return null;
    }
  }

  async function init() {
    if (initializing.value || unsubscribe) {
      return;
    }
    initializing.value = true;

    try {
      const client = ensureClient();
      if (!client) {
        return;
      }

      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        error.value = sessionError.message;
      }

      session.value = data.session;
      user.value = data.session?.user ?? null;

      const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
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

    const client = ensureClient();
    if (!client) {
      loading.value = false;
      throw new Error(error.value ?? 'Supabase 未正确配置');
    }

    const { data: result, error: authError } = await client.auth.signInWithPassword(payload);
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

    const client = ensureClient();
    if (!client) {
      loading.value = false;
      throw new Error(error.value ?? 'Supabase 未正确配置');
    }

    const { data: result, error: authError } = await client.auth.signUp(payload);
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
    const client = ensureClient();
    if (!client) {
      throw new Error(error.value ?? 'Supabase 未正确配置');
    }

    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      error.value = signOutError.message;
      throw signOutError;
    }
    session.value = null;
    user.value = null;
  }

  async function signInWithProvider(provider: Provider) {
    resetError();
    const client = ensureClient();
    if (!client) {
      throw new Error(error.value ?? 'Supabase 未正确配置');
    }

    const { error: authError } = await client.auth.signInWithOAuth({ provider });
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
