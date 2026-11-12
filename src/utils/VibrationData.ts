// Data handling for the Vibration Logger plot. Times are in seconds since the
// Unix epoch.

export type SampleSeries = {
  labels: string[];
  time: number[];
  channels: number[][];
};

export function createSeries(labels: string[]): SampleSeries {
  return { labels, time: [], channels: labels.map(() => []) };
}

// Reads a CSV that `vilo log save` wrote. A header is required with `tick`
// and `timestamp` (nanoseconds) columns; every other column is a channel and
// keeps its name. A trailing comma on each line is accepted.
export function parseViloCsv(text: string): SampleSeries {
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
  const timeIndex = header.indexOf("timestamp");
  if (header.indexOf("tick") < 0 || timeIndex < 0) {
    throw new Error("The file needs a header with tick and timestamp columns.");
  }
  const channelIndexes = header
    .map((_, i) => i)
    .filter((i) => header[i] !== "tick" && header[i] !== "timestamp");
  if (channelIndexes.length === 0) {
    throw new Error("The file has no channel columns.");
  }
  const series = createSeries(channelIndexes.map((i) => header[i]));
  for (let row = 1; row < lines.length; row++) {
    const cells = split(lines[row]);
    if (cells.length !== header.length) {
      throw new Error(
        `Line ${row + 1} has ${cells.length} values, the header has ${header.length}.`,
      );
    }
    const time = Number(cells[timeIndex]) / 1e9;
    if (!Number.isFinite(time)) {
      throw new Error(`Line ${row + 1} has an invalid timestamp.`);
    }
    series.time.push(time);
    channelIndexes.forEach((col, c) => {
      series.channels[c].push(Number(cells[col]));
    });
  }
  if (series.time.length === 0) {
    throw new Error("The file has no data.");
  }
  return series;
}

// Index of the first element not less than `value`, in an ascending array.
export function lowerBound(values: number[], value: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (values[mid] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// Index of the first element greater than `value`, in an ascending array.
export function upperBound(values: number[], value: number): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (values[mid] <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export type PlotWindow = {
  // uPlot data: time first, then one array per channel.
  data: number[][];
  // Lowest and highest value of the visible channels in the window.
  lo: number;
  hi: number;
};

// The samples between `start` and `end`. With more than `maxPoints` samples,
// each bucket keeps its lowest and highest value per channel, so peaks stay
// visible. Hidden channels do not count toward `lo` and `hi`.
export function sliceWindow(
  series: SampleSeries,
  start: number,
  end: number,
  maxPoints: number,
  visible: boolean[],
): PlotWindow {
  const from = lowerBound(series.time, start);
  const to = upperBound(series.time, end);
  const count = Math.max(0, to - from);
  let lo = Infinity;
  let hi = -Infinity;
  const extend = (c: number, v: number) => {
    if (visible[c] && Number.isFinite(v)) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  };

  if (count <= maxPoints) {
    const data = [series.time.slice(from, to)];
    series.channels.forEach((channel, c) => {
      const values = channel.slice(from, to);
      values.forEach((v) => extend(c, v));
      data.push(values);
    });
    return { data, lo, hi };
  }

  const buckets = Math.max(1, Math.floor(maxPoints / 2));
  const time: number[] = [];
  const values: number[][] = series.channels.map(() => []);
  for (let b = 0; b < buckets; b++) {
    const i0 = from + Math.floor((b * count) / buckets);
    const i1 = from + Math.floor(((b + 1) * count) / buckets);
    if (i1 <= i0) continue;
    time.push(series.time[i0], series.time[i1 - 1]);
    series.channels.forEach((channel, c) => {
      let min = Infinity;
      let max = -Infinity;
      let minAt = i0;
      let maxAt = i0;
      for (let i = i0; i < i1; i++) {
        const v = channel[i];
        if (v < min) {
          min = v;
          minAt = i;
        }
        if (v > max) {
          max = v;
          maxAt = i;
        }
      }
      extend(c, min);
      extend(c, max);
      if (minAt <= maxAt) {
        values[c].push(min, max);
      } else {
        values[c].push(max, min);
      }
    });
  }
  return { data: [time, ...values], lo, hi };
}

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

// What the range strip selects, in seconds from the first sample.
export type RangeView = {
  // The end handle is at the newest sample, so the window follows new data.
  follow: boolean;
  // The start handle is at the first sample.
  whole: boolean;
  // Window width while following.
  width: number;
  // Window while not following.
  from: number;
  to: number;
};

export const minimumSpan = 1;

export function liveView(): RangeView {
  return { follow: true, whole: false, width: 30, from: 0, to: 30 };
}

export function wholeView(): RangeView {
  return { follow: true, whole: true, width: 30, from: 0, to: 30 };
}

// The window shown for `total` seconds of data.
export function shownRange(view: RangeView, total: number): [number, number] {
  if (view.follow) {
    return [view.whole ? 0 : Math.max(0, total - view.width), total];
  }
  const end = Math.min(Math.max(view.to, minimumSpan), total);
  const start = Math.max(0, Math.min(view.from, end - minimumSpan));
  return [start, end];
}

// Within 0.5% of an end, a handle counts as at that end.
function nearStart(value: number, total: number): boolean {
  return value <= total * 0.005;
}

function nearEnd(value: number, total: number): boolean {
  return value >= total * 0.995;
}

export function moveRangeStart(
  view: RangeView,
  total: number,
  value: number,
): RangeView {
  const [, end] = shownRange(view, total);
  const start = Math.max(0, Math.min(value, end - minimumSpan));
  const whole = nearStart(start, total);
  return {
    follow: view.follow,
    whole,
    width: end - start,
    from: whole ? 0 : start,
    to: end,
  };
}

export function moveRangeEnd(
  view: RangeView,
  total: number,
  value: number,
): RangeView {
  const [start] = shownRange(view, total);
  const end = Math.min(total, Math.max(value, start + minimumSpan));
  return {
    follow: nearEnd(end, total),
    whole: nearStart(start, total),
    width: end - start,
    from: start,
    to: end,
  };
}

export function isWholeRange(view: RangeView, total: number): boolean {
  const [start, end] = shownRange(view, total);
  return nearStart(start, total) && nearEnd(end, total);
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
  time: number[],
  values: number[],
  buckets: number,
  width: number,
  height: number,
): string {
  const count = time.length;
  if (count < 2) return "";
  const t0 = time[0];
  const span = time[count - 1] - t0 || 1;
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
      const v = values[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
    mins.push(min);
    maxs.push(max);
    xs.push(((time[i0] - t0) / span) * width);
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

// Appends sweeps from `vilo log show` (timestamps in nanoseconds) to a
// series of the channels ch1, ch2 and ch3.
export function appendSweeps(
  series: SampleSeries,
  sweeps: { timestamp: number; ch1: number; ch2: number; ch3: number }[],
): void {
  for (const sweep of sweeps) {
    series.time.push(sweep.timestamp / 1e9);
    series.channels[0].push(sweep.ch1);
    series.channels[1].push(sweep.ch2);
    series.channels[2].push(sweep.ch3);
  }
}
