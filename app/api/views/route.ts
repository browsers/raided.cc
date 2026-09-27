import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { createClient } from "../../lib/supabase/server";

// How long a "already counted this visitor" cookie sticks around for.
// Refreshing/spamming raided.cc/[handle] within this window doesn't add
// another view; coming back after it expires does.
const DEDUPE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

// The live profile_views table has its own viewer_hash column (a
// per-visitor fingerprint, presumably meant as a DB-level second layer
// of dedupe alongside the viewed_day column) — this derives a value for
// it from IP + User-Agent rather than storing either raw. It's coarse
// (shared IPs/UAs collide) but that's fine for a view counter.
function viewerHash(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex");
}

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
    const { error: insertError } = await supabase.from("profile_views").insert({
      profile_id: profile.id,
      viewer_hash: viewerHash(request),
    });

    // Only mark this visitor as "counted" if the insert actually went
    // through — a unique-violation (code 23505) means the DB itself
    // already had this viewer_hash/profile/day combo and rejected the
    // duplicate, which counts as success here, not a failure.
    if (insertError && insertError.code !== "23505") {
      console.error("profile_views insert failed:", insertError.message);
    } else {
      cookieStore.set(cookieName, "1", {
        maxAge: DEDUPE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
      });
    }
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