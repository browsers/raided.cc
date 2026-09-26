"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import "./Sidebar.css";
import {
  HomeIcon,
  UserIcon,
  PaletteIcon,
  LinkIcon,
  EmbedIcon,
  BadgeIcon,
  SettingsIcon,
  ExternalLinkIcon,
  DiscordIcon,
} from "./icons";

// TODO: swap for the authenticated user's row from Supabase.
const CURRENT_USER = {
  displayName: "vvs",
  handle: "@x",
  avatarInitial: "V",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
  { href: "/dashboard/appearance", label: "Appearance", icon: PaletteIcon },
  { href: "/dashboard/links", label: "Links", icon: LinkIcon },
  { href: "/dashboard/embed", label: "Embed", icon: EmbedIcon },
  { href: "/dashboard/badges", label: "Badges", icon: BadgeIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar__brand">
        <BrandMark />
      </div>

      <nav className="dash-sidebar__nav">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`dash-nav-item${active ? " dash-nav-item--active" : ""}`}
            >
              <Icon className="dash-nav-item__icon" />
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
            {CURRENT_USER.avatarInitial}
          </div>
          <div className="dash-account-card__meta">
            <span className="dash-account-card__name">
              {CURRENT_USER.displayName}
            </span>
            <span className="dash-account-card__handle">
              {CURRENT_USER.handle}
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
      <span className="dash-brand-mark__text">raided.cc</span>
      <span className="dash-brand-mark__rule" />
    </div>
  );
}
