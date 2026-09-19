/**
 * The one place a USD cost becomes text.
 *
 * Precision follows magnitude, because a single cheap run and a whole PR's spend
 * differ by orders of magnitude: fixed 2 decimals would flatten every run to
 * "$0.00", and fixed 4 would clutter the larger sums. See `specs/01-run-cost.md`.
 *
 *   null/undefined → "—"   (no run yet, or a model with no known price)
 *   0              → "$0"
 *   < $0.01        → "$0.0013"
 *   < $1           → "$0.014"
 *   >= $1          → "$1.27"
 */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null || Number.isNaN(usd)) return "—";
  if (usd === 0) return "$0";
  const abs = Math.abs(usd);
  if (abs < 0.01) return `$${usd.toFixed(4)}`;
  if (abs < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
