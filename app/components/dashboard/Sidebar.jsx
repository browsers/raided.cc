"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import FuzzyText from "../FuzzyText";
import { supabase } from "../../lib/supabaseClient";
import "./Sidebar.css";
import { ExternalLinkIcon, DiscordIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "/icons/overview.png" },
  { href: "/dashboard/profile", label: "Profile", icon: "/icons/profile.png" },
  { href: "/dashboard/appearance", label: "Appearance", icon: "/icons/appearance.png" },
  { href: "/dashboard/links", label: "Links", icon: "/icons/links.png" },
  { href: "/dashboard/embed", label: "Embed", icon: "/icons/embed.png" },
  { href: "/dashboard/badges", label: "Badges", icon: "/icons/badges.png" },
  { href: "/dashboard/settings", label: "Settings", icon: "/icons/settings.png" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled || error || !profile) return;

      setCurrentUser({
        displayName: profile.handle,
        handle: `@${profile.handle}`,
        avatarInitial: profile.handle.charAt(0).toUpperCase(),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar__brand">
        <BrandMark />
      </div>

      <nav className="dash-sidebar__nav">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`dash-nav-item${active ? " dash-nav-item--active" : ""}`}
            >
              <img src={icon} alt="" className="dash-nav-item__icon" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dash-sidebar__footer">
        <a className="dash-pill-link" href="#" target="_blank" rel="noreferrer">
          <span className="dash-pill-link__dot" />
          <ExternalLinkIcon className="dash-pill-link__icon" />
          <span>View Profile</span>
        </a>
        <a className="dash-pill-link" href="#" target="_blank" rel="noreferrer">
          <span className="dash-pill-link__dot" />
          <DiscordIcon className="dash-pill-link__icon" />
          <span>Discord</span>
        </a>

        <div className="dash-account-card">
          <div className="dash-account-card__avatar">
            {currentUser?.avatarInitial ?? ""}
          </div>
          <div className="dash-account-card__meta">
            <span className="dash-account-card__name">
              {currentUser?.displayName ?? "…"}
            </span>
            <span className="dash-account-card__handle">
              {currentUser?.handle ?? ""}
            </span>
          </div>
          <ExternalLinkIcon className="dash-account-card__action" />
        </div>
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <div className="dash-brand-mark">
      <div className="dash-brand-mark__title">
        <span className="dash-brand-mark__static">raided</span>
        <FuzzyText
          fontSize={28}
          fontWeight={700}
          color="#f5f5f5"
          enableHover
          baseIntensity={0.12}
          hoverIntensity={0.55}
          fuzzRange={6}
          transitionDuration={12}
          className="dash-brand-mark__fuzzy"
        >
          .cc
        </FuzzyText>
      </div>
      <span className="dash-brand-mark__rule" />
    </div>
  );
}