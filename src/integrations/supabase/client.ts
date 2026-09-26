import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';
import { TARGET_SUPABASE_URL, TARGET_SUPABASE_PUBLISHABLE_KEY } from './target';

// The project URL and publishable (anon) key are public by design; RLS protects data.
const SUPABASE_URL = TARGET_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = TARGET_SUPABASE_PUBLISHABLE_KEY;



// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;
