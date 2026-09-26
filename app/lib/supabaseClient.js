import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — set them in .env.local"
  );
}

// Browser client. Session now lives in httpOnly cookies instead of
// localStorage, so it isn't readable from JS/devtools anymore — the
// browser just sends it automatically with requests.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);