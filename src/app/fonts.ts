import { Host_Grotesk, IBM_Plex_Mono } from "next/font/google";

// Display face for headings and large figures.
export const hostGrotesk = Host_Grotesk({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-host-grotesk",
});

// Body face: everything else, including numbers.
export const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});
