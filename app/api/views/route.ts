import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../lib/supabase/server";

// How long a "already counted this visitor" cookie sticks around for.
// Refreshing/spamming raided.cc/[handle] within this window doesn't add
// another view; coming back after it expires does.
const DEDUPE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

// POST { handle } -> { views }
// Called client-side once per profile-page load (see ProfileCard.jsx).
// Looks the handle up to a profile id, logs a view unless this browser
// already has this profile's dedupe cookie, then returns the all-time
// total so the page can render the "views" badge immediately.
export async function POST(request: Request) {
  let handle: string | undefined;
  try {
    ({ handle } = await request.json());
  } catch {
    // fall through to the missing-handle response below
  }

  if (!handle || typeof handle !== "string") {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieStore = cookies();
  const cookieName = `pv_${profile.id}`;
  const alreadyCountedThisVisit = Boolean(cookieStore.get(cookieName));

  if (!alreadyCountedThisVisit) {
    await supabase.from("profile_views").insert({ profile_id: profile.id });
    cookieStore.set(cookieName, "1", {
      maxAge: DEDUPE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  // Signed-out visitors aren't the profile owner, so RLS won't let them
  // read profile_views rows directly — this RPC is a SECURITY DEFINER
  // function that hands back just the count. See
  // supabase/profile_views_migration.sql.
  const { data: totalViews, error: countError } = await supabase.rpc(
    "get_profile_view_count",
    { p_profile_id: profile.id }
  );

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({ views: totalViews ?? 0 });
}
