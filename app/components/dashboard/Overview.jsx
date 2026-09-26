"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "./TopBar";
import OverviewRow from "./OverviewRow";
import StatCards from "./StatCards";
import ViewsChart from "./ViewsChart";
import ChecklistCard from "./ChecklistCard";
import { UserIcon, PaletteIcon, LinkIcon, ContainerIcon } from "./icons";
import "./Overview.css";

function buildEmptyWeek(since) {
  const week = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const label = `${String(day.getMonth() + 1).padStart(2, "0")}-${String(
      day.getDate()
    ).padStart(2, "0")}`;
    week.push({ label, value: 0 });
  }
  return week;
}

function startOfWeekWindow() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);
  return since;
}

// Buckets a profile's view rows from the last 7 days into one count per
// day, oldest first, plus the all-time total. Runs two small queries
// rather than pulling every row ever, since total is a cheap head-count.
async function loadViewStats(profileId) {
  const since = startOfWeekWindow();

  const [{ count: totalViews }, { data: recentViews }] = await Promise.all([
    supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId),
    supabase
      .from("profile_views")
      .select("viewed_at")
      .eq("profile_id", profileId)
      .gte("viewed_at", since.toISOString()),
  ]);

  const week = buildEmptyWeek(since);
  const byKey = new Map(
    week.map((bucket, i) => {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      return [day.toISOString().slice(0, 10), bucket];
    })
  );

  for (const row of recentViews ?? []) {
    const bucket = byKey.get(row.viewed_at.slice(0, 10));
    if (bucket) bucket.value += 1;
  }

  return {
    totalViews: totalViews ?? 0,
    week,
  };
}

function formatAccountAge(createdAt) {
  if (!createdAt) return { label: "—", date: "" };

  const created = new Date(createdAt);
  const dateLabel = created.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((Date.now() - created.getTime()) / msPerDay);
  if (days < 365) {
    return { label: `${days} day${days === 1 ? "" : "s"}`, date: dateLabel };
  }

  const years = Math.floor(days / 365.25);
  return { label: `${years} year${years === 1 ? "" : "s"}`, date: dateLabel };
}

export default function Overview() {
  const [profile, setProfile] = useState(null);
  const [viewStats, setViewStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [{ data, error }, stats] = await Promise.all([
        supabase
          .from("profiles")
          .select("uid, handle, bio, avatar_url, created_at")
          .eq("id", user.id)
          .maybeSingle(),
        loadViewStats(user.id),
      ]);

      if (cancelled) return;
      if (!error && data) setProfile(data);
      setViewStats(stats);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handle = profile?.handle ?? "";
  const hasAvatar = Boolean(profile?.avatar_url);
  const hasBio = Boolean(profile?.bio && profile.bio.trim().length > 0);
  // Links + container customization aren't wired to real data yet either —
  // treated as not-done until those tables/columns exist.
  const hasLinks = false;
  const hasCustomContainer = false;

  const essentials = [
    { label: "Add a profile picture", icon: UserIcon, done: hasAvatar },
    { label: "Write a bio", icon: PaletteIcon, done: hasBio },
    { label: "Add social links", icon: LinkIcon, done: hasLinks },
    { label: "Customize your container", icon: ContainerIcon, done: hasCustomContainer },
  ];
  const essentialsDone = essentials.filter((item) => item.done).length;
  const completionPct = Math.round((essentialsDone / essentials.length) * 100);
  const accountAge = formatAccountAge(profile?.created_at);

  return (
    <div className="dash-overview-shell">
      <TopBar breadcrumb="RAIDED.CC / EDIT" title="Overview" />

      <div className="dash-overview-body">
        <OverviewRow
          displayName={loading ? "…" : handle || "there"}
          handle={handle}
          completionPct={loading ? 0 : completionPct}
          essentialsDone={essentialsDone}
          essentialsTotal={essentials.length}
        />

        <StatCards
          totalViews={viewStats?.totalViews ?? 0}
          uid={profile?.uid ?? null}
          alias={handle}
          accountAgeLabel={accountAge.label}
          accountAgeDate={accountAge.date}
        />

        <div className="dash-bottom-row dash-overview-body__bottom">
          <ViewsChart data={viewStats?.week ?? buildEmptyWeek(startOfWeekWindow())} />
          <ChecklistCard
            title="Complete Your Profile"
            subtitle="Casual Encouragement"
            items={essentials}
          />
        </div>
      </div>
    </div>
  );
}