"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FuzzyText from "../FuzzyText";
import { supabase } from "../../lib/supabaseClient";
import "./Sidebar.css";
import { ExternalLinkIcon, DiscordIcon } from "./icons";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "/icons/overview.png" },
  { key: "profile", label: "Profile", icon: "/icons/profile.png" },
  { key: "appearance", label: "Appearance", icon: "/icons/appearance.png" },
  { key: "links", label: "Links", icon: "/icons/links.png" },
  { key: "embed", label: "Embed", icon: "/icons/embed.png" },
  { key: "badges", label: "Badges", icon: "/icons/badges.png" },
  { key: "settings", label: "Settings", icon: "/icons/settings.png" },
];

export default function Sidebar({ activeTab, onSelectTab }) {
  const [currentUser, setCurrentUser] = useState(null);
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });

  // Measure the active button's position relative to the nav container
  // so the sliding indicator can animate to it. Re-runs whenever the
  // active tab changes, and once more on resize in case row height
  // ever varies (e.g. wrapped labels on a narrower sidebar).
  useLayoutEffect(() => {
    const measure = () => {
      const navEl = navRef.current;
      const activeEl = itemRefs.current[activeTab];
      if (!navEl || !activeEl) return;

      const navRect = navEl.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();

      setIndicator({
        top: itemRect.top - navRect.top,
        height: itemRect.height,
        ready: true,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("handle, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled || error || !profile) return;

      setCurrentUser({
        displayName: profile.handle,
        handle: `@${profile.handle}`,
        avatarUrl: profile.avatar_url ?? null,
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

      <nav className="dash-sidebar__nav" ref={navRef}>
        <div
          className="dash-nav-indicator"
          style={{
            transform: `translateY(${indicator.top}px)`,
            height: indicator.height,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
        {NAV_ITEMS.map(({ key, label, icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              ref={(el) => {
                itemRefs.current[key] = el;
              }}
              onClick={() => onSelectTab?.(key)}
              className={`dash-nav-item${active ? " dash-nav-item--active" : ""}`}
            >
              <img src={icon} alt="" className="dash-nav-item__icon" />
              <span>{label}</span>
            </button>
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
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt=""
                className="dash-account-card__avatar-img"
              />
            ) : (
              <img
                src="/icons/profile.png"
                alt=""
                className="dash-account-card__avatar-icon"
              />
            )}
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