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
      const [tag, ...parameters] = part.trim().split(';');
      const quality = parameters.map((parameter) => parameter.trim()).find((parameter) => /^q=/i.test(parameter));
      const weight = quality ? Number(quality.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight };
    })
    .filter(({ weight }) => Number.isFinite(weight) && weight > 0 && weight <= 1)
    .sort((first, second) => second.weight - first.weight);

  for (const { tag } of preferred) {
    const language = tag.split('-')[0];
    if (isLocale(language)) return language;
  }
  return defaultLocale;
}
