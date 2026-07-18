'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import {
  LOCALE_COOKIE,
  localeLabels,
  locales,
  type Locale,
} from '@/i18n/config';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** compact = icon + native select; pill = segmented control */
  variant?: 'compact' | 'pills';
};

/**
 * Sets the NEXT_LOCALE cookie and refreshes so server + client pick up the new locale.
 * FR default · AR (RTL) · EN — no URL rewrite.
 */
export function LocaleSwitcher({ className, variant = 'compact' }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  if (variant === 'pills') {
    return (
      <div
        role="group"
        aria-label={t('language')}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-raised p-1',
          pending && 'opacity-70',
          className,
        )}
      >
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            disabled={pending}
            aria-pressed={code === locale}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-colors',
              code === locale
                ? 'bg-primary text-primary-foreground'
                : 'text-text-muted hover:text-foreground',
            )}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 text-text-muted hover:text-foreground transition-colors',
        pending && 'opacity-70',
        className,
      )}
    >
      <Languages className="w-4 h-4 shrink-0" aria-hidden />
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t('language')}
        className="bg-transparent text-sm font-medium outline-none cursor-pointer appearance-none pe-1"
      >
        {locales.map((code) => (
          <option key={code} value={code} className="bg-surface text-foreground">
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
