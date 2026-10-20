const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Parse "12.5" or "$1,200.00" into cents. Returns null for anything invalid or ≤ 0.
 * Commas are only accepted as thousands separators, so "12,50" is rejected rather
 * than silently read as 1250.
 */
export function parseDollars(input: string): number | null {
  const cleaned = input.replace(/[$\s]/g, '');
  if (!/^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned.replace(/,/g, '')) * 100);
  return cents > 0 ? cents : null;
}
