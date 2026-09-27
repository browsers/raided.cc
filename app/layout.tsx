import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "raided.cc",
  description: "Invite-only link-in-bio.",
};

// Every selectable font in Identity.jsx that isn't a system/web-safe font
// (Arial, Georgia, Times New Roman, Courier New, Comic Sans MS, Trebuchet
// MS, Verdana, Impact) needs to actually be fetched, or the dashboard's
// Font dropdown just silently falls back to sans-serif for anything the
// visitor's OS doesn't happen to have installed. One css2 request pulls
// them all in; the dashboard (display name) and the public profile card
// (name + bio, via ProfileCard's fontFamily prop) both just reference
// these family names directly, same as the system fonts already do.
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Montserrat:wght@400;600;700",
    "family=Anton",
    "family=Bebas+Neue",
    "family=Oswald:wght@400;600;700",
    "family=Press+Start+2P",
    "family=Pixelify+Sans:wght@400;700",
    "family=VT323",
    "family=Silkscreen",
    "family=Fredoka:wght@400;600;700",
    "family=Baloo+2:wght@400;700",
    "family=Luckiest+Guy",
    "family=Bubblegum+Sans",
    "family=Chewy",
    "family=Bungee",
    "family=Bangers",
    "family=Permanent+Marker",
    "family=Caveat:wght@400;700",
    "family=Dancing+Script:wght@400;700",
    "family=Orbitron:wght@400;700",
    "family=Creepster",
  ].join("&") +
  "&display=swap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}