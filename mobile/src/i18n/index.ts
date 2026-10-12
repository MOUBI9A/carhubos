import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
  en: { translation: en },
};

// Determine default locale (Morocco default is FR, AR supported, fallback FR)
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'fr';
const initialLanguage = ['ar', 'fr', 'en'].includes(deviceLocale) ? deviceLocale : 'fr';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: initialLanguage,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lang: 'fr' | 'ar' | 'en') => {
  i18n.changeLanguage(lang);
  const isRTL = lang === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
};

export default i18n;
