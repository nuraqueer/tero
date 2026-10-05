import { bytesToBase64Url, openText, randomBytes, sealText } from '@tero/crypto';

/** What a sealed journeys box holds. Only the member's devices ever see this. */
export type JourneyStep = { id: string; text: string; done: boolean };
export type Journey = { id: string; title: string; steps: JourneyStep[]; note: string };
export type JourneyBook = { v: 1; journeys: Journey[] };

export const journeyLimits = { journeys: 10, steps: 30, title: 80, step: 200, note: 1000 };

/** Ready-made plans; their text comes from the translations when a plan starts. */
export const journeyTemplates = {
  care: 6,
  papers: 5,
  move: 6,
  surgery: 6,
} as const;
export type JourneyTemplate = keyof typeof journeyTemplates;

const context = 'tero-journeys/v1';

export const emptyBook = (): JourneyBook => ({ v: 1, journeys: [] });

export function newId(): string {
  return bytesToBase64Url(randomBytes(9));
}

const isString = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

/** Reads a book, dropping anything that doesn't fit the shape or the limits. */
function parseBook(text: string): JourneyBook | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const book = data as Partial<JourneyBook> | null;
  if (!book || book.v !== 1 || !Array.isArray(book.journeys)) return null;
  const journeys = book.journeys
    .filter(
      (j): j is Journey =>
        !!j &&
        isString(j.id, 40) &&
        isString(j.title, journeyLimits.title) &&
        isString(j.note, journeyLimits.note) &&
        Array.isArray(j.steps),
    )
    .slice(0, journeyLimits.journeys)
    .map((j) => ({
      id: j.id,
      title: j.title,
      note: j.note,
      steps: j.steps
        .filter(
          (s) =>
            !!s &&
            isString(s.id, 40) &&
            isString(s.text, journeyLimits.step) &&
            typeof s.done === 'boolean',
        )
        .slice(0, journeyLimits.steps)
        .map((s) => ({ id: s.id, text: s.text, done: s.done })),
    }));
  return { v: 1, journeys };
}

export function sealBook(key: Uint8Array, book: JourneyBook): string {
  return sealText(key, context, JSON.stringify(book));
}

/** Null if the box can't be opened with this key (for example, other 12 words). */
export function openBook(key: Uint8Array, box: string): JourneyBook | null {
  const text = openText(key, context, box);
  return text === null ? null : parseBook(text);
}
