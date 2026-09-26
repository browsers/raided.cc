import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Server-side client for Server Components, Route Handlers, and Server
// Actions. Reads/writes the session via cookies instead of localStorage.
// Not used yet since every page here is "use client", but this is the
// piece you'll want once you add server-rendered routes (e.g. the
// request-access page) that need to know who's signed in.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component that can't set cookies —
          // fine as long as middleware.ts is refreshing the session.
        }
      },
    },
  });
}
