import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "@/lib/QueryProvider";
import { dirForLocale, type Locale } from "@/i18n/config";

// Licensed fonts are self-hosted so production builds need no Google Fonts network.
// ── Fider Lux type system (Phase 12) ──────────────────────────────────────────
// Fraunces = warm editorial serif for marketing display only.
// Hanken Grotesk = humanist grotesque for all UI/body (replaces cold Inter).
// IBM Plex Mono = tabular figures for money (MAD), plates, CIN/contract IDs.
// Noto Sans Arabic = body/UI when locale is AR (RTL).
const fraunces = localFont({
  src: "../fonts/Fraunces.ttf",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
});
const hanken = localFont({
  src: "../fonts/HankenGrotesk.ttf",
  weight: "100 900",
  variable: "--font-hanken",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-Regular.ttf", weight: "400" },
    { path: "../fonts/IBMPlexMono-Medium.ttf", weight: "500" },
    { path: "../fonts/IBMPlexMono-SemiBold.ttf", weight: "600" },
  ],
  variable: "--font-plex",
  display: "swap",
});
const notoArabic = localFont({
  src: "../fonts/NotoSansArabic.ttf",
  weight: "100 900",
  variable: "--font-noto-arabic",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirForLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`h-full antialiased dark ${fraunces.variable} ${hanken.variable} ${plexMono.variable} ${notoArabic.variable}`}
    >
      <body
        className={`min-h-full flex flex-col bg-background text-foreground font-sans ${
          locale === "ar" ? "font-arabic" : ""
        }`}
      >
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
                <CommandPalette />
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
