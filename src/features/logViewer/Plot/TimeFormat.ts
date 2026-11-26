// Formatting for timestamps stored as Unix time in seconds (with fractions).

const pad = (n: number, width = 2) => n.toString().padStart(width, "0");

function splitMicros(seconds: number) {
  const totalMicros = Math.round(seconds * 1e6);
  const date = new Date(Math.floor(totalMicros / 1000));
  const micros = ((totalMicros % 1e6) + 1e6) % 1e6;
  return { date, micros };
}

// Local time of day, e.g. "14:03:12" or "14:03:12.123" with 3 decimals.
export function formatTime(seconds: number, decimals = 6): string {
  const { date, micros } = splitMicros(seconds);
  const hms = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  if (decimals <= 0) return hms;
  return `${hms}.${pad(micros, 6).slice(0, decimals)}`;
}

// Local date and time with microseconds, e.g. "2026-11-26 14:03:12.123456".
// Samples are ~66.7 µs apart, so millisecond precision would show many rows
// with the same time.
export function formatTimestamp(seconds: number): string {
  const { date } = splitMicros(seconds);
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${ymd} ${formatTime(seconds)}`;
}

// Converts a timestamp column to Unix time in seconds. Files store it in
// different units: drivercom logs in seconds (older ones in milliseconds) and
// the Vibration Logger in nanoseconds. Present-day epoch values differ by
// three orders of magnitude per unit, so the first finite value tells which.
export function toUnixSeconds(values: number[]): number[] {
  const first = values.find((v) => Number.isFinite(v));
  if (first === undefined) return values;
  const magnitude = Math.abs(first);
  let divisor = 1;
  if (magnitude >= 1e17)
    divisor = 1e9; // nanoseconds
  else if (magnitude >= 1e14)
    divisor = 1e6; // microseconds
  else if (magnitude >= 1e11) divisor = 1e3; // milliseconds
  if (divisor === 1) return values;
  return values.map((v) => v / divisor);
}

// Decimals needed to tell apart ticks `incr` seconds apart (0 to 6).
export function decimalsForIncrement(incr: number): number {
  if (!(incr > 0)) return 0;
  const decimals = Math.ceil(-Math.log10(incr) - 1e-9);
  return Math.min(6, Math.max(0, decimals));
}
