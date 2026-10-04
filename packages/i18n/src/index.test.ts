import { describe, expect, it } from 'vitest';
import { locales, matchLocale, messages, t } from './index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  const englishKeys = Object.keys(messages.en).sort();

  it.each(locales)('%s has every message, none empty', (locale) => {
    expect(Object.keys(messages[locale]).sort()).toEqual(englishKeys);
    for (const value of Object.values(messages[locale])) expect(value.trim()).not.toBe('');
  });

  it.each(locales)('%s keeps the same placeholders as English', (locale) => {
    for (const key of englishKeys as Array<keyof typeof messages.en>) {
      expect(placeholders(messages[locale][key])).toEqual(placeholders(messages.en[key]));
    }
  });
});

describe('t', () => {
  it('fills placeholders', () => {
    expect(t('en', 'card.changesIn', { seconds: 30 })).toBe('Changes in 30s');
  });

  it('leaves unknown placeholders visible', () => {
    expect(t('en', 'card.changesIn')).toBe('Changes in {seconds}s');
  });
});

describe('matchLocale', () => {
  it('matches regional tags to a supported language', () => {
    expect(matchLocale(['sw-KE'])).toBe('sw');
    expect(matchLocale(['zh-Hans-CN'])).toBe('zh');
    expect(matchLocale(['de-DE', 'fr-FR'])).toBe('fr');
  });

  it('falls back to English', () => {
    expect(matchLocale(['de-DE'])).toBe('en');
    expect(matchLocale([])).toBe('en');
  });
});
