import { notFound } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import { getBadgeMeta } from "../lib/badgeCatalog";
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
      "id, handle, display_name, avatar_url, avatar_hidden, background_url, background_type, background_color, glow_color, glow_style, font, font_target, bio_mode, bio_type_speed_ms, bio_delete_hold_ms, bio_delete_speed_ms, bio_cursor, uid, audio_muted, badges_animated, badge_color, username_effect"
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) notFound();

  const [{ data: bioLines }, { data: badgeRows }, { data: trackRows }] = await Promise.all([
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
  ]);

  const badges: { id: string; icon: string; label: string }[] = (badgeRows ?? [])
    .map((row) => {
      const meta = getBadgeMeta(row.badge_key);
      return meta ? { id: row.badge_key, icon: meta.icon, label: meta.label } : null;
    })
    .filter((b): b is { id: string; icon: string; label: string } => b !== null);

  return (
    <ProfileCard
      profile={profile}
      bioLines={bioLines ?? []}
      badges={badges}
      tracks={trackRows ?? []}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}) {
  const handle = params.handle?.toLowerCase();
  return {
    title: `@${handle} — raided.cc`,
  };
}