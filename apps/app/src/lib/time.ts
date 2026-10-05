import type { MessageKey } from '@tero/i18n';

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** "6 d left", or "5 h left" in the last day. */
export function timeLeft(t: T, expiresAt: number, now = Date.now()): string {
  const hours = Math.max(1, Math.ceil((expiresAt - now) / 3_600_000));
  return hours >= 24
    ? t('time.daysLeft', { count: Math.floor(hours / 24) })
    : t('time.hoursLeft', { count: hours });
}
