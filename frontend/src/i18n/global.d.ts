import type fr from '../../messages/fr.json';

type Messages = typeof fr;

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'fr' | 'ar' | 'en';
    Messages: Messages;
  }
}
