// Data handling for the Vibration Logger plot. Times are in seconds since the
// Unix epoch.

import { RingBuffer } from "./RingBuffer";

// Up to `capacity` samples, one ring buffer per value. Once full, each new
// sample replaces the oldest. Sample i is at get(i) in every buffer, 0
// being the oldest.
export class SampleSeries {
  readonly labels: string[];
  readonly time: RingBuffer;
  // vilo's sweep counter.
  readonly ticks: RingBuffer;
  readonly channels: RingBuffer[];

  constructor(labels: string[], capacity: number) {
    this.labels = labels;
    this.time = new RingBuffer(capacity);
    this.channels = labels.map(() => new RingBuffer(capacity));
    this.ticks = new RingBuffer(capacity);
  }

  // Adds one sample, in place of the oldest when the series is full.
  // `stamp` is its timestamp in nanoseconds since the epoch.
  push(tick: number, stamp: number, values: number[]): void {
    this.time.push(stamp / 1e9);
    this.ticks.push(tick);
    values.forEach((v, c) => this.channels[c].push(v));
  }

  // Appends the sweeps of one `vilo log show` to a series of the channels
  // ch1, ch2 and ch3: one array per field, all the same length, pushed in
  // one go each. Timestamps are nanoseconds since the epoch.
  appendSweeps(sweeps: {
    tick: number[];
    timestamp: number[];
    ch1: number[];
    ch2: number[];
    ch3: number[];
  }): void {
    this.time.pushSlice(sweeps.timestamp.map((stamp) => stamp / 1e9));
    this.ticks.pushSlice(sweeps.tick);
    [sweeps.ch1, sweeps.ch2, sweeps.ch3].forEach((values, c) =>
      this.channels[c].pushSlice(values),
    );
  }

  // Every sample between `start` and `end`, and each channel's stats over
  // them. Hidden channels do not count toward `lo` and `hi`.
  sliceWindow(start: number, end: number, visible: boolean[]): PlotWindow {
    const from = lowerBound(this.time, start);
    const to = upperBound(this.time, end);
    const count = Math.max(0, to - from);
    // Copied out of the ring buffers in blocks.
    const time = this.time.getSlice(from, from + count);
    const values = this.channels.map((channel) =>
      channel.getSlice(from, from + count),
    );
    const stats = values.map(calculateStats);
    let lo = Infinity;
    let hi = -Infinity;
    stats.forEach(({ min, max }, c) => {
      if (visible[c]) {
        lo = Math.min(lo, min);
        hi = Math.max(hi, max);
      }
    });
    return { data: [time, ...values], lo, hi, stats };
  }

  // The header line of the CSV that Save CSV writes and `parseCsv` reads:
  // timestamp, then each channel's label. Every line ends with a
  // comma.
  formatCsvHeader(): string {
    return `timestamp,${this.labels.join(",")},\n`;
  }

  // The CSV lines of samples `from` to `to` (exclusive), counted from the
  // oldest kept sample, after the header.
  formatCsvRows(from: number, to: number): string {
    const lines: string[] = [];
    for (let i = from; i < to; i++) {
      // Within a microsecond of vilo's timestamp, which a JS number cannot
      // hold exactly.
      const stamp = Math.round(this.time.get(i) * 1e9);
      const values = this.channels.map((channel) => `${channel.get(i)},`);
      lines.push(`${stamp},${values.join("")}\n`);
    }
    return lines.join("");
  }
}

// One channel's stats over `values`. Missing values (NaN) do not count. The
// sums are of each value minus `shift`, the first one counted, so that a
// large offset does not swallow the small variations in rounding errors.
function calculateStats(values: Float64Array): ChannelStats {
  let n = 0;
  let shift = 0;
  let sum = 0;
  let sumSq = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (n === 0) shift = v;
    if (v < min) min = v;
    if (v > max) max = v;
    const d = v - shift;
    sum += d;
    sumSq += d * d;
    n++;
  }
  if (n === 0) return { min, max, mean: NaN, rms: NaN };
  const offset = sum / n;
  const variance = Math.max(0, sumSq / n - offset * offset);
  return { min, max, mean: shift + offset, rms: Math.sqrt(variance) };
}

// Samples that `minutes` of logging at `sampleRate`, as vilo names it (such
// as "512hz"), gives.
export function calculateCapacity(sampleRate: string, minutes: number): number {
  const match = sampleRate.match(/^(\d+)hz$/);
  if (!match) {
    throw new Error(`Unknown sample rate ${sampleRate}.`);
  }
  return Number(match[1]) * minutes * 60;
}

// Reads a CSV that Save CSV wrote, in the format vilo's former `log save`
// wrote too. A header is required with a `timestamp` (nanoseconds) column;
// a `tick` column is optional, as Save CSV no longer writes it. Every other
// column is a channel and keeps its name. A trailing
// comma on each line is accepted.
export function parseCsv(text: string): SampleSeries {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    throw new Error("The file is empty.");
  }
  const split = (line: string) => {
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length > 0 && cells[cells.length - 1] === "") {
      cells.pop();
    }
    return cells;
  };
  const header = split(lines[0]);
  const tickIndex = header.indexOf("tick");
  const timeIndex = header.indexOf("timestamp");
  if (timeIndex < 0) {
    throw new Error("The file needs a header with a timestamp column.");
  }
  const channelIndexes = header
    .map((_, i) => i)
    .filter((i) => header[i] !== "tick" && header[i] !== "timestamp");
  if (channelIndexes.length === 0) {
    throw new Error("The file has no channel columns.");
  }
  // Room for every line, so the file is kept whole.
  const series = new SampleSeries(
    channelIndexes.map((i) => header[i]),
    lines.length - 1,
  );
  for (let row = 1; row < lines.length; row++) {
    const cells = split(lines[row]);
    if (cells.length !== header.length) {
      throw new Error(
        `Line ${row + 1} has ${cells.length} values, the header has ${header.length}.`,
      );
    }
    const stamp = Number(cells[timeIndex]);
    if (!Number.isFinite(stamp)) {
      throw new Error(`Line ${row + 1} has an invalid timestamp.`);
    }
    series.push(
      tickIndex < 0 ? NaN : Number(cells[tickIndex]),
      stamp,
      channelIndexes.map((col) => Number(cells[col])),
    );
  }
  if (series.time.length === 0) {
    throw new Error("The file has no data.");
  }
  return series;
}

// Index of the first value not less than `value`, in ascending values.
export function lowerBound(values: RingBuffer, value: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (values.get(mid) < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// Index of the first value greater than `value`, in ascending values.
export function upperBound(values: RingBuffer, value: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (values.get(mid) <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// One channel's lowest, highest and mean value, and its RMS around the mean,
// so that an offset such as gravity does not count. Without samples, `min`
// is Infinity, `max` -Infinity, and `mean` and `rms` NaN.
export type ChannelStats = {
  min: number;
  max: number;
  mean: number;
  rms: number;
};

export type PlotWindow = {
  // uPlot data: time first, then one array per channel.
  data: Float64Array[];
  // Lowest and highest value of the visible channels in the window.
  lo: number;
  hi: number;
  // Each channel's, visible or not, from every sample in the window.
  stats: ChannelStats[];
};

function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

export type Axis = { min: number; max: number; step: number };

// Five evenly spaced ticks at round values (1, 2, 2.5 or 5 x 10^n) that cover
// lo..hi with 8% margin.
export function fitAxis(lo: number, hi: number): Axis {
  if (!(hi > lo)) {
    lo = (Number.isFinite(lo) ? lo : 0) - 1;
    hi = (Number.isFinite(hi) ? hi : 0) + 1;
  }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;
  let step = niceStep((hi - lo) / 4);
  let first = Math.floor(lo / step) * step;
  while (first + 4 * step < hi) {
    step = niceStep(step * 1.01);
    first = Math.floor(lo / step) * step;
  }
  return { min: first, max: first + 4 * step, step };
}

// What the range strip selects. Times are in seconds since the epoch, like
// the samples', so a window stays on its samples while older ones are
// dropped.
export type RangeView = {
  // The end handle is at the newest sample, so the window follows new data.
  follow: boolean;
  // The start handle is at the oldest kept sample.
  whole: boolean;
  // Window width while following.
  width: number;
  // Window while not following.
  from: number;
  to: number;
};

// Times of the oldest and the newest kept sample.
export type Span = [number, number];

export const minimumSpan = 1;

export function liveView(): RangeView {
  return { follow: true, whole: false, width: 30, from: 0, to: 30 };
}

export function wholeView(): RangeView {
  return { follow: true, whole: true, width: 30, from: 0, to: 30 };
}

// The window shown of the samples in `span`.
export function shownRange(view: RangeView, span: Span): [number, number] {
  const [first, last] = span;
  if (view.follow) {
    return [view.whole ? first : Math.max(first, last - view.width), last];
  }
  // Once its oldest samples are dropped, the window moves on with the oldest
  // kept one, at the same width.
  const shift = Math.max(0, first - view.from);
  const end = Math.min(Math.max(view.to + shift, first + minimumSpan), last);
  const start = Math.max(first, Math.min(view.from + shift, end - minimumSpan));
  return [start, end];
}

// Within 0.5% of an end, a handle counts as at that end.
function nearStart(value: number, [first, last]: Span): boolean {
  return value - first <= (last - first) * 0.005;
}

function nearEnd(value: number, [first, last]: Span): boolean {
  return value - first >= (last - first) * 0.995;
}

export function moveRangeStart(
  view: RangeView,
  span: Span,
  value: number,
): RangeView {
  const [, end] = shownRange(view, span);
  const start = Math.max(span[0], Math.min(value, end - minimumSpan));
  const whole = nearStart(start, span);
  return {
    follow: view.follow,
    whole,
    width: end - start,
    from: whole ? span[0] : start,
    to: end,
  };
}

export function moveRangeEnd(
  view: RangeView,
  span: Span,
  value: number,
): RangeView {
  const [start] = shownRange(view, span);
  const end = Math.min(span[1], Math.max(value, start + minimumSpan));
  return {
    follow: nearEnd(end, span),
    whole: nearStart(start, span),
    width: end - start,
    from: start,
    to: end,
  };
}

export function isWholeRange(view: RangeView, span: Span): boolean {
  const [start, end] = shownRange(view, span);
  return nearStart(start, span) && nearEnd(end, span);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

// Time of day as HH:MM:SS, or HH:MM:SS.mmm.
export function formatClock(seconds: number, withMs: boolean): string {
  const date = new Date(seconds * 1000);
  const text = `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}`;
  return withMs ? `${text}.${pad(date.getMilliseconds(), 3)}` : text;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 3600), 2)}:${pad(Math.floor(s / 60) % 60, 2)}:${pad(s % 60, 2)}`;
}

// An SVG path of one channel's lowest and highest value per bucket, scaled
// to a width x height box.
export function overviewPath(
  time: RingBuffer,
  values: RingBuffer,
  buckets: number,
  width: number,
  height: number,
): string {
  const count = time.length;
  if (count < 2) return "";
  const t0 = time.get(0);
  const span = time.get(count - 1) - t0 || 1;
  const mins: number[] = [];
  const maxs: number[] = [];
  const xs: number[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  const n = Math.min(buckets, count);
  for (let b = 0; b < n; b++) {
    const i0 = Math.floor((b * count) / n);
    const i1 = Math.floor(((b + 1) * count) / n);
    let min = Infinity;
    let max = -Infinity;
    for (let i = i0; i < i1; i++) {
      const v = values.get(i);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
    mins.push(min);
    maxs.push(max);
    xs.push(((time.get(i0) - t0) / span) * width);
    lo = Math.min(lo, min);
    hi = Math.max(hi, max);
  }
  if (xs.length === 0) return "";
  const range = hi - lo || 1;
  const y = (v: number) => (height * (hi - v)) / range;
  const top = xs.map(
    (x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y(maxs[i]).toFixed(1)}`,
  );
  const bottom = xs
    .map((x, i) => `L${x.toFixed(1)},${y(mins[i]).toFixed(1)}`)
    .reverse();
  return `${top.join("")}${bottom.join("")}Z`;
}

// Decimals needed to write every multiple of `step` exactly.
export function axisDecimals(step: number): number {
  for (let d = 0; d < 6; d++) {
    const scaled = step * Math.pow(10, d);
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9 * Math.max(1, scaled)) {
      return d;
    }
  }
  return 6;
}

// An acceleration axis label, such as "−0.25 g".
export function formatAcceleration(value: number, step: number): string {
  const text = Math.abs(value).toFixed(axisDecimals(step));
  return `${value < -step * 1e-6 ? "−" : ""}${text} g`;
}
