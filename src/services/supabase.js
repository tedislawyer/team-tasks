import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Липсват настройките за Supabase във файла .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
