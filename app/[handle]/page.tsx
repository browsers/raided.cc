import { notFound } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import { getBadgeMeta } from "../lib/badgeCatalog";
import { getDiscordGuildTag } from "../lib/discord";
import { getEmbedForHandle, getSiteOrigin } from "../lib/embedServer";
import { CARD_COLUMNS } from "../lib/cardStyle";
import ProfileCard from "./ProfileCard";

// The public card at raided.cc/[handle]. Server-rendered so it works for
// signed-out visitors and loads with real data already in the HTML
// (no avatar/name pop-in). All the actual layout lives in ProfileCard —
// this file is just lookup + 404 handling.
export default async function PublicProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = params.handle?.toLowerCase();
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, handle, display_name, avatar_url, avatar_hidden, background_url, background_type, background_color, glow_color, glow_style, font, font_target, bio_mode, bio_type_speed_ms, bio_delete_hold_ms, bio_delete_speed_ms, bio_cursor, uid, audio_muted, badges_animated, badge_color, username_effect, discord_user_id, discord_tag_size"
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) notFound();

  // Own query so a missing discord_tag_layout column (migration not run
  // yet) can never make a real profile 404 — it just falls back to inline.
  const { data: tagLayoutRow } = await supabase
    .from("profiles")
    .select("discord_tag_layout")
    .eq("id", profile.id)
    .maybeSingle();

  // Same idea for the Appearance columns: own query, so the migration not
  // being run yet just means everyone renders the minimal layout.
  const { data: appearanceRow } = await supabase
    .from("profiles")
    .select(CARD_COLUMNS)
    .eq("id", profile.id)
    .maybeSingle();

  const [{ data: bioLines }, { data: badgeRows }, { data: trackRows }, discordTag] = await Promise.all([
    supabase
      .from("profile_bio_lines")
      .select("line, position")
      .eq("profile_id", profile.id)
      .order("position", { ascending: true }),
    // Only badges the user has both been granted and left enabled show up
    // publicly — see profile_badges_migration.sql for how those get granted.
    supabase
      .from("profile_badges")
      .select("badge_key")
      .eq("profile_id", profile.id)
      .eq("enabled", true),
    supabase
      .from("profile_tracks")
      .select("url, title")
      .eq("profile_id", profile.id)
      .order("position", { ascending: true }),
    getDiscordGuildTag(profile.discord_user_id),
  ]);

  const badges: { id: string; icon: string; label: string }[] = (badgeRows ?? [])
    .map((row) => {
      const meta = getBadgeMeta(row.badge_key);
      return meta ? { id: row.badge_key, icon: meta.icon, label: meta.label } : null;
    })
    .filter((b): b is { id: string; icon: string; label: string } => b !== null);

  return (
    <ProfileCard
      profile={{
        ...profile,
        ...(appearanceRow ?? {}),
        discord_tag_layout: tagLayoutRow?.discord_tag_layout ?? "inline",
      }}
      bioLines={bioLines ?? []}
      badges={badges}
      tracks={trackRows ?? []}
      discordTag={discordTag}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}) {
  const handle = params.handle?.toLowerCase();
  const pageTitle = `@${handle} — raided.cc`;

  const origin = getSiteOrigin();
  const embed = await getEmbedForHandle(handle, origin);
  if (!embed) return { title: pageTitle };

  const { settings } = embed;
  const images = settings.imageUrl ? [{ url: settings.imageUrl }] : undefined;

  return {
    title: pageTitle,
    description: settings.description || undefined,

    // Open Graph / Twitter tags: what every other app reads, and what
    // Discord falls back to if it can't use the component embed below.
    openGraph: {
      type: "website",
      url: settings.pageUrl,
      siteName: "raided.cc",
      title: settings.title,
      description: settings.description || undefined,
      images,
    },
    twitter: {
      card: settings.imageUrl && settings.layout === "large" ? "summary_large_image" : "summary",
      title: settings.title,
      description: settings.description || undefined,
      images: settings.imageUrl ? [settings.imageUrl] : undefined,
    },
    // Discord's accent bar color on the fallback card.
    other: { "theme-color": settings.accent },

    // Discord's component embed (the buttons-under-the-card version).
    // Metadata API has no first-class "arbitrary <link>", but icons.other
    // renders a plain <link rel=... href=... type=...> into <head>, which
    // is exactly what Discord looks for. Nothing else sets icons here, so
    // this doesn't override a favicon.
    icons: {
      other: [
        {
          rel: "discord:component-embed",
          url: `${origin}/api/embed/${handle}`,
          type: "application/json",
        },
      ],
    },
  };
}