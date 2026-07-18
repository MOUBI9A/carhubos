/**
 * Fider i18n config — Phase 7.
 * FR is the product default (Morocco). AR is RTL. EN is the third locale.
 * Locale is cookie-based (no URL prefix) so existing routes stay stable.
 */

export const locales = ['fr', 'ar', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

/** Cookie name read by middleware + getRequestConfig. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** BCP 47 tags for Intl (dates, numbers, currency MAD). */
export const localeToBcp47: Record<Locale, string> = {
  fr: 'fr-MA',
  ar: 'ar-MA',
  en: 'en-GB',
};

export const localeLabels: Record<Locale, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function dirForLocale(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Map Accept-Language header to a supported locale (FR wins ties / default). */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: (tag || '').toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferred) {
    if (tag.startsWith('ar')) return 'ar';
    if (tag.startsWith('fr')) return 'fr';
    if (tag.startsWith('en')) return 'en';
  }
  return defaultLocale;
}
