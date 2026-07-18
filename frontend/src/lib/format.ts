/**
 * Locale-aware formatters for MAD money, dates, and numbers.
 * Use with `useLocale()` from next-intl, or pass an explicit locale.
 */

import type { Locale } from '@/i18n/config';
import { defaultLocale, isLocale, localeToBcp47 } from '@/i18n/config';

function bcp47(locale: string): string {
  return isLocale(locale) ? localeToBcp47[locale] : localeToBcp47[defaultLocale];
}

/** Format a MAD amount (e.g. "1 250,00 MAD" in fr-MA). */
export function formatMoney(
  amount: number | null | undefined,
  locale: string = defaultLocale,
  opts?: { compact?: boolean },
): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat(bcp47(locale), {
    style: 'currency',
    currency: 'MAD',
    currencyDisplay: 'code',
    minimumFractionDigits: opts?.compact ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/** Format a plain number with locale grouping. */
export function formatNumber(
  value: number | null | undefined,
  locale: string = defaultLocale,
  opts?: Intl.NumberFormatOptions,
): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(bcp47(locale), opts).format(Number(value));
}

/** Short date (day month year). */
export function formatDate(
  iso: string | Date | null | undefined,
  locale: string = defaultLocale,
): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(bcp47(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Date + time. */
export function formatDateTime(
  iso: string | Date | null | undefined,
  locale: string = defaultLocale,
): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(bcp47(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export type Formatters = {
  money: (n: number | null | undefined, opts?: { compact?: boolean }) => string;
  number: (n: number | null | undefined, opts?: Intl.NumberFormatOptions) => string;
  date: (iso: string | Date | null | undefined) => string;
  dateTime: (iso: string | Date | null | undefined) => string;
  locale: Locale | string;
};

/** Build formatters bound to a locale (safe for server or client). */
export function createFormatters(locale: string): Formatters {
  return {
    locale,
    money: (n, opts) => formatMoney(n, locale, opts),
    number: (n, opts) => formatNumber(n, locale, opts),
    date: (iso) => formatDate(iso, locale),
    dateTime: (iso) => formatDateTime(iso, locale),
  };
}
