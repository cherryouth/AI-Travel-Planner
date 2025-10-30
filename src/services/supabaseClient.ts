import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');

function readEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  const message = `环境变量 ${String(key)} 未设置，Supabase 客户端可能无法正常工作。`;
  if (import.meta.env.DEV) {
    console.warn(message);
  } else {
    console.error(message);
  }

  return '';
}

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 环境变量缺失，请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY');
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabase;
}
