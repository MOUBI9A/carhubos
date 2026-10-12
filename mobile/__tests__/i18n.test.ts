import fr from '../src/i18n/locales/fr.json';
import ar from '../src/i18n/locales/ar.json';
import en from '../src/i18n/locales/en.json';

describe('Internationalization & Moroccan Localization Suite', () => {
  it('contains mandatory brand identity across all supported languages', () => {
    expect(fr.common.brand).toBe('Fider');
    expect(ar.common.brand).toBe('فدّر');
    expect(en.common.brand).toBe('Fider');
  });

  it('guarantees Moroccan Dirham (MAD) currency marker in all locales', () => {
    expect(fr.common.mad).toBe('MAD');
    expect(ar.common.mad).toBe('درهم');
    expect(en.common.mad).toBe('MAD');
  });

  it('provides matching inspection keys across French, Arabic, and English', () => {
    expect(fr.inspection.title).toBeDefined();
    expect(ar.inspection.title).toBeDefined();
    expect(en.inspection.title).toBeDefined();

    expect(fr.inspection.odometer).toBeDefined();
    expect(ar.inspection.odometer).toBeDefined();
    expect(en.inspection.odometer).toBeDefined();

    expect(fr.inspection.fuelLevel).toBeDefined();
    expect(ar.inspection.fuelLevel).toBeDefined();
    expect(en.inspection.fuelLevel).toBeDefined();

    expect(fr.inspection.signature).toBeDefined();
    expect(ar.inspection.signature).toBeDefined();
    expect(en.inspection.signature).toBeDefined();
  });

  it('provides CNDP / RGPD account deletion warning in all locales', () => {
    expect(fr.settings.deleteAccount).toBeDefined();
    expect(ar.settings.deleteAccount).toBeDefined();
    expect(en.settings.deleteAccount).toBeDefined();

    expect(fr.settings.deleteWarning).toContain('09-08');
    expect(ar.settings.deleteWarning).toContain('09-08');
  });
});
