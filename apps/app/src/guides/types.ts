import type { Locale } from '@tero/i18n';

export type GuideSection = { id: string; heading: string; paragraphs: string[] };
export type GuideBody = { note?: string; sections: GuideSection[] };

/** A guide's text in every language. Non-English text needs native review. */
export type GuideText = Record<Locale, GuideBody>;
