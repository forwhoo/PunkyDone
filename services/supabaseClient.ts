
import { createClient } from '@supabase/supabase-js';

// These should be in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

if (!hasSupabaseConfig) {
    console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Running without Supabase.');
}

const fallbackUrl = 'https://example.supabase.co';
const fallbackKey = 'missing-supabase-key';

export const supabase = createClient(
    hasSupabaseConfig ? supabaseUrl : fallbackUrl,
    hasSupabaseConfig ? supabaseKey : fallbackKey,
    {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    }
);

export const supabaseEnabled = hasSupabaseConfig;
