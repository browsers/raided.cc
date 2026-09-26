// Small inline icon set for the dashboard. Kept as plain SVG (no icon
// package dependency) so stroke width / sizing stays consistent and
// predictable everywhere they're used.

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20.5c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

export function PaletteIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-1 2-2.1 0-.5-.2-1-.5-1.4-.4-.5-.2-1.2.4-1.4.4-.1.8-.1 1.2-.1A5 5 0 0 0 20 13c0-5.5-4-10-8-10Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 7l1.6-1.6a3.6 3.6 0 0 1 5 5L16 12" />
      <path d="M13 17l-1.6 1.6a3.6 3.6 0 0 1-5-5L8 12" />
    </svg>
  );
}

export function EmbedIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 8.5 4 12l4 3.5" />
      <path d="M16 8.5 20 12l-4 3.5" />
      <path d="M13.5 6.5 10.5 17.5" />
    </svg>
  );
}

export function BadgeIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="10" r="5.5" />
      <path d="M9 15 7.5 21l4.5-2.5L16.5 21 15 15" />
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6h9v9" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function DiscordIcon(props) {
  return (
    <svg {...base} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M8.5 4.5c-1.6.3-3 .8-4.3 1.5C2 9.5 1.4 13.3 1.7 17c1.5 1.1 3 1.8 4.6 2.3.4-.6.7-1.2 1-1.9-.6-.2-1.1-.5-1.6-.8.1-.1.3-.2.4-.3 3.1 1.4 6.5 1.4 9.6 0l.4.3c-.5.3-1 .6-1.6.8.3.7.6 1.3 1 1.9 1.6-.5 3.1-1.2 4.6-2.3.4-4.6-.8-8.4-3.5-11-1.3-.7-2.7-1.2-4.2-1.5l-.2.4c1.3.3 2.5.8 3.6 1.4-1.9-1-4-1.5-6.1-1.5s-4.2.5-6.1 1.5c1.1-.6 2.3-1.1 3.6-1.4Zm-.3 6.6c-1 0-1.8.9-1.8 2s.8 2 1.8 2 1.8-.9 1.8-2-.8-2-1.8-2Zm7.6 0c-1 0-1.8.9-1.8 2s.8 2 1.8 2 1.8-.9 1.8-2-.8-2-1.8-2Z" />
    </svg>
  );
}

export function ChartIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function ChevronIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ImageIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <path d="M4 16.5 9 12l3 3 3.5-3.5L20 16" />
    </svg>
  );
}

export function BioIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M9 10h6" />
      <path d="M9 13.5h6" />
      <path d="M9 17h3.5" />
    </svg>
  );
}

export function HashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4 7 20" />
      <path d="M17 4 15 20" />
      <path d="M4 9h16" />
      <path d="M3 15h16" />
    </svg>
  );
}

export function ContainerIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.5h16" />
    </svg>
  );
}