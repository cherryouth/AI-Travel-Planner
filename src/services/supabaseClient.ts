import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');

function readEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  console.warn(`环境变量 ${String(key)} 未设置，将使用空字符串。`);
  return '';
}

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}
