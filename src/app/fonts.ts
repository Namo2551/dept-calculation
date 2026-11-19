import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

export const plexThai = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-plex-thai",
});

export const plexMono = IBM_Plex_Mono({
  weight: ["500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});
