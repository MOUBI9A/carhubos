import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { defaultLocale, dirForLocale, locales, negotiateLocale } from './config';
import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';

function flatten(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

function messageAt(catalog: unknown, key: string): string {
  return key.split('.').reduce<unknown>((current, segment) => (current as Record<string, unknown>)[segment], catalog) as string;
}

function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\s*[,}]/g)].map((match) => match[1]))].sort();
}

describe('locale catalogs', () => {
  it('keeps the three catalogs structurally identical', () => {
    const expected = flatten(fr).sort();
    expect(flatten(ar).sort()).toEqual(expected);
    expect(flatten(en).sort()).toEqual(expected);
  });

  it('does not contain empty translations', () => {
    for (const catalog of [fr, ar, en]) {
      expect(flatten(catalog).every((key) => {
        const value = key.split('.').reduce<unknown>((current, segment) => (
          current && typeof current === 'object' ? (current as Record<string, unknown>)[segment] : undefined
        ), catalog);
        return typeof value === 'string' ? value.trim().length > 0 : true;
      })).toBe(true);
    }
  });

  it('keeps the locale contract explicit', () => {
    expect(locales).toEqual(['fr', 'ar', 'en']);
    expect(defaultLocale).toBe('fr');
    expect(dirForLocale('ar')).toBe('rtl');
    expect(dirForLocale('fr')).toBe('ltr');
    expect(dirForLocale('en')).toBe('ltr');
  });

  it('preserves interpolation arguments across languages', () => {
    for (const key of flatten(en)) {
      const expected = placeholders(messageAt(en, key));
      expect(placeholders(messageAt(fr, key)), `fr: ${key}`).toEqual(expected);
      expect(placeholders(messageAt(ar, key)), `ar: ${key}`).toEqual(expected);
    }
  });

  it.each(['fr', 'ar', 'en'] as const)('renders every %s message and plural branch without ICU errors', (locale) => {
    const catalog = { fr, ar, en }[locale];
    for (const key of flatten(catalog)) {
      const translate = createTranslator({
        locale,
        messages: { message: messageAt(catalog, key) },
        onError: (error) => { throw error; },
      });
      const names = placeholders(messageAt(catalog, key));
      for (const count of [0, 1, 2, 3, 11, 100]) {
        const values = Object.fromEntries(names.map((name) => [name, count]));
        expect(translate('message', values).trim().length, `${locale}: ${key}, count=${count}`).toBeGreaterThan(0);
      }
    }
  });

  it.each([
    [null, 'fr'],
    ['ar-MA,fr;q=0.8,en;q=0.5', 'ar'],
    ['fr;q=0.5,en-GB;q=1', 'en'],
    ['ar;q=0,fr;q=0.5', 'fr'],
    ['fr; q=0.2,en; q=0.9', 'en'],
    ['english,fr;q=0.7', 'fr'],
    ['ar;q=invalid,en;q=0.5', 'en'],
    ['ar;q=2,en;q=0.5', 'en'],
  ])('negotiates supported languages from %s', (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });
});
