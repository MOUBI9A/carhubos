import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "@/lib/QueryProvider";

// ── Fider Lux type system (Phase 12) ──────────────────────────────────────────
// Fraunces = warm editorial serif for marketing display only.
// Hanken Grotesk = humanist grotesque for all UI/body (replaces cold Inter).
// IBM Plex Mono = tabular figures for money (MAD), plates, CIN/contract IDs.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fider — the trust layer for mobility",
  description:
    "The operating system for car-rental agencies. Trust, fleet and finance on one spine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased dark ${fraunces.variable} ${hanken.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <CommandPalette />
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
