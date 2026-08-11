import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
// Unparsed text of the same three files. `?raw` is resolved by the bundler, so
// this needs no filesystem access and no assumption about the working
// directory — it points at exactly the files the imports above parse.
import arRaw from '../../messages/ar.json?raw';
import enRaw from '../../messages/en.json?raw';
import frRaw from '../../messages/fr.json?raw';
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

  /**
   * The two tests above import the catalogs, which means JSON.parse has
   * already run — and JSON.parse silently keeps only the LAST of a repeated
   * key. That is exactly the step that hides a duplicate, so no test that
   * works on the parsed object can ever catch one.
   *
   * Duplicates had accumulated in all three catalogs: 42 keys, 9 of them with
   * two different translations, where somebody's edit was dead on arrival
   * because a later line in the same file overrode it. Reading the raw text
   * is the only way to see them.
   */
  it('has no duplicate keys in the raw catalog files', () => {
    for (const [locale, raw] of Object.entries({
      fr: frRaw,
      ar: arRaw,
      en: enRaw,
    })) {
      const duplicates: string[] = [];
      // Keys defined so far in the object open at each nesting depth. Entering
      // an object resets its depth, so two sibling namespaces may of course
      // both define "cancel" — only a repeat inside the SAME object is a bug.
      const seenAtDepth: Array<Set<string>> = [];
      let depth = 0;

      for (let i = 0; i < raw.length; i += 1) {
        const ch = raw[i];

        if (ch === '{') {
          depth += 1;
          seenAtDepth[depth] = new Set();
          continue;
        }
        if (ch === '}') {
          depth -= 1;
          continue;
        }
        if (ch !== '"') continue;

        // Read the whole string literal, honouring escapes.
        let end = i + 1;
        while (end < raw.length && raw[end] !== '"') {
          end += raw[end] === '\\' ? 2 : 1;
        }
        const literal = raw.slice(i + 1, end);
        i = end;

        // It is a key only if the next non-whitespace character is a colon;
        // otherwise it was a value and we simply skipped over it.
        let after = end + 1;
        while (after < raw.length && /\s/.test(raw[after])) after += 1;
        if (raw[after] !== ':') continue;

        const seen = seenAtDepth[depth];
        if (seen.has(literal)) duplicates.push(literal);
        seen.add(literal);
      }

      expect(duplicates, `duplicate keys in messages/${locale}.json`).toEqual([]);
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
