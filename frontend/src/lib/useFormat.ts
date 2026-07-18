'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { createFormatters, type Formatters } from './format';

/** Client hook: money / date / number formatters for the active locale. */
export function useFormat(): Formatters {
  const locale = useLocale();
  return useMemo(() => createFormatters(locale), [locale]);
}
