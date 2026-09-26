// Salary helpers.
// HR may enter salary either in LPA (e.g. "6") or in absolute rupees (e.g. "600000").
// Anything >= 1000 is treated as absolute rupees, anything smaller as LPA.
export function toLpa(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 1000 ? n / 100000 : n;
}

export function formatLpaRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  fallback = "Not disclosed"
): string {
  const lo = toLpa(min);
  const hi = toLpa(max);
  if (!lo && !hi) return fallback;
  if (lo && hi && lo !== hi) return `₹${lo.toFixed(1)} - ${hi.toFixed(1)} LPA`;
  return `₹${(lo || hi).toFixed(1)} LPA`;
}
