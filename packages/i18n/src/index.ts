import { en } from './locales/en';
import { fr } from './locales/fr';
import { ko } from './locales/ko';
import { sw } from './locales/sw';
import { zh } from './locales/zh';
import type { MessageKey, Messages } from './types';

export type { MessageKey, Messages };

export const locales = ['en', 'fr', 'ko', 'sw', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const messages: Record<Locale, Messages> = { en, fr, ko, sw, zh };

/** Each language's name, written in that language. */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ko: '한국어',
  sw: 'Kiswahili',
  zh: '中文',
};

export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Picks the first supported language from a list of language tags,
 * such as the phone's preferred languages ("sw-KE", "zh-Hans-CN").
 */
export function matchLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const base = tag.toLowerCase().split(/[-_]/)[0] ?? '';
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

/** Returns the message in the given language, filling {placeholders} from vars. */
export function t(
  locale: Locale,
  key: MessageKey,
  vars: Record<string, string | number> = {},
): string {
  const template = messages[locale][key] ?? messages[defaultLocale][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}
