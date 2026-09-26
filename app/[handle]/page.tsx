import { notFound } from "next/navigation";
import { createClient } from "../lib/supabase/server";
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
      "id, handle, display_name, avatar_url, background_url, background_type, background_color, glow_color, glow_style, font, bio_mode"
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) notFound();

  const { data: bioLines } = await supabase
    .from("profile_bio_lines")
    .select("line, position")
    .eq("profile_id", profile.id)
    .order("position", { ascending: true });

  return <ProfileCard profile={profile} bioLines={bioLines ?? []} />;
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
