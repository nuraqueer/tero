/** Compact membership totals, carrying rounded thresholds into the next unit. */
export function compactMemberCount(count: number): string {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('invalid member count');
  if (count < 1000) return String(count);
  const units = ['k', 'm', 'b', 't'];
  let unit = Math.min(Math.floor(Math.log10(count) / 3) - 1, units.length - 1);
  let value = Math.round((count / 1000 ** (unit + 1)) * 10) / 10;
  if (value >= 1000 && unit < units.length - 1) {
    unit++;
    value = Math.round((value / 1000) * 10) / 10;
  }
  return `${value}${units[unit]}`;
}
