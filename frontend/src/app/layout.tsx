import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono, Noto_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "@/lib/QueryProvider";
import { dirForLocale, type Locale } from "@/i18n/config";

// ── Fider Lux type system (Phase 12) ──────────────────────────────────────────
// Fraunces = warm editorial serif for marketing display only.
// Hanken Grotesk = humanist grotesque for all UI/body (replaces cold Inter).
// IBM Plex Mono = tabular figures for money (MAD), plates, CIN/contract IDs.
// Noto Sans Arabic = body/UI when locale is AR (RTL).
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
const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
