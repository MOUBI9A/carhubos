import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { defaultLocale, dirForLocale, locales } from './config';
import { describe, expect, it } from 'vitest';

function flatten(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
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
});
