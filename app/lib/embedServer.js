// Server-only. Loads a profile's Discord embed settings and builds the
// component payload. Shared by [handle]/page.tsx (generateMetadata) and
// /api/embed/[handle] so both always agree.
import { headers } from "next/headers";
import { createClient } from "./supabase/server";
import { buildComponentEmbed, resolveEmbed } from "./discordEmbed";

const EMBED_COLUMNS =
  "embed_title, embed_description, embed_accent, embed_image_layout, embed_image_url, embed_buttons";

// The origin the request actually came in on (raided.cc, localhost:3000,
// a preview deploy...). Discord wants the linked JSON on the *same site*
// as the page, so we derive it instead of hardcoding a domain.
export function getSiteOrigin() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "https://raided.cc";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// The one "official" address for share links, og:url and the default
// "Open page" button — no www — regardless of which host the request came
// in on. Override with NEXT_PUBLIC_SITE_URL if the domain ever changes.
export function getCanonicalOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://raided.cc").replace(/\/+$/, "");
}

/**
 * @returns {Promise<null | { settings: ReturnType<typeof resolveEmbed>, built: ReturnType<typeof buildComponentEmbed> }>}
 *   null when the handle doesn't exist.
 */
export async function getEmbedForHandle(rawHandle, origin) {
  const handle = String(rawHandle ?? "").toLowerCase();
  if (!handle) return null;

  const supabase = createClient();

  // Identity lookup first, on columns that always exist — so a missing
  // embed migration can never make a real profile look like a 404.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) return null;

  // Embed columns second. If the migration hasn't been run this errors and
  // `row` is null -> resolveEmbed just falls back to defaults.
  const { data: row } = await supabase
    .from("profiles")
    .select(EMBED_COLUMNS)
    .eq("id", profile.id)
    .maybeSingle();

  const settings = resolveEmbed(
    row,
    { handle: profile.handle, displayName: profile.display_name },
    getCanonicalOrigin() // not `origin`: keeps www out of og:url + default button
  );

  return { settings, built: buildComponentEmbed(settings) };
}