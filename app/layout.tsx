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
    // Standard / sans
    "family=Montserrat:wght@400;600;700",
    "family=Inter:wght@400;600;700",
    "family=Roboto:wght@400;500;700",
    "family=Open+Sans:wght@400;600;700",
    "family=Lato:wght@400;700",
    "family=Nunito:wght@400;600;700",
    // Serif
    "family=Playfair+Display:wght@400;700",
    "family=Merriweather:wght@400;700",
    "family=Lora:wght@400;600",
    // Mono
    "family=JetBrains+Mono:wght@400;700",
    "family=Space+Mono:wght@400;700",
    // Bold & display
    "family=Anton",
    "family=Bebas+Neue",
    "family=Oswald:wght@400;600;700",
    "family=Archivo+Black",
    "family=Alfa+Slab+One",
    "family=Staatliches",
    "family=Passion+One:wght@400;700",
    // Pixel
    "family=Press+Start+2P",
    "family=Pixelify+Sans:wght@400;700",
    "family=VT323",
    "family=Silkscreen",
    "family=Jersey+10",
    "family=DotGothic16",
    // Bubble
    "family=Fredoka:wght@400;600;700",
    "family=Baloo+2:wght@400;700",
    "family=Luckiest+Guy",
    "family=Bubblegum+Sans",
    "family=Chewy",
    "family=Titan+One",
    "family=Sniglet:wght@400;800",
    "family=Varela+Round",
    // Graffiti & comic
    "family=Bungee",
    "family=Bangers",
    "family=Permanent+Marker",
    "family=Rock+Salt",
    "family=Shrikhand",
    // Script & handwriting
    "family=Caveat:wght@400;700",
    "family=Dancing+Script:wght@400;700",
    "family=Great+Vibes",
    "family=Pacifico",
    "family=Satisfy",
    "family=Sacramento",
    "family=Kalam:wght@400;700",
    // Futuristic & spooky
    "family=Orbitron:wght@400;700",
    "family=Audiowide",
    "family=Creepster",
    "family=Nosifer",
    "family=Monoton",
    "family=Eater",
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