import type uPlot from "uplot";

// First and last x values of the plot's data. X values are either cycle
// indexes (0 to length - 1) or Unix timestamps in seconds, so the full x range
// must come from the data rather than from its length.
export function xDataRange(u: uPlot): [number, number] {
  const xs = u.data[0];
  if (xs.length === 0) return [0, 0];
  return [xs[0], xs[xs.length - 1]];
}

// Moves [min, max] back inside [lo, hi] without changing its width. A window
// wider than [lo, hi] is clamped to [lo, hi].
export function clampWindow(
  min: number,
  max: number,
  lo: number,
  hi: number,
): [number, number] {
  const width = max - min;
  if (width >= hi - lo) return [lo, hi];
  if (min < lo) return [lo, lo + width];
  if (max > hi) return [hi - width, hi];
  return [min, max];
}
