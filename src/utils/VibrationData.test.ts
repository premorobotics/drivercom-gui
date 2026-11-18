import { describe, expect, test } from "vitest";
import {
  axisDecimals,
  calculateCapacity,
  formatAcceleration,
  fitAxis,
  isWholeRange,
  liveView,
  lowerBound,
  moveRangeEnd,
  moveRangeStart,
  parseCsv,
  SampleSeries,
  shownRange,
  upperBound,
  wholeView,
} from "./VibrationData";

// A series of these samples, with room for `capacity`, so that the first
// ones are dropped if it is smaller. Times are in seconds.
function seriesOf(
  time: number[],
  channels: number[][],
  capacity = time.length,
): SampleSeries {
  const series = new SampleSeries(
    channels.map((_, c) => `ch${c + 1}`),
    capacity,
  );
  time.forEach((t, i) => {
    series.push(
      i,
      t * 1e9,
      channels.map((channel) => channel[i]),
    );
  });
  return series;
}

describe("parseCsv", () => {
  test("reads a CSV with trailing commas", () => {
    const actual = parseCsv(
      "tick,timestamp,ch1,ch2,ch3,\n" +
        "1,1000000000,0.5,-0.25,1,\n" +
        "2,1002000000,0.75,0,1.5,\n",
    );
    expect(actual.labels).toStrictEqual(["ch1", "ch2", "ch3"]);
    expect(actual.time.toArray()).toStrictEqual([1, 1.002]);
    expect(actual.channels.map((c) => c.toArray())).toStrictEqual([
      [0.5, 0.75],
      [-0.25, 0],
      [1, 1.5],
    ]);
  });

  test("keeps column names and order", () => {
    const actual = parseCsv("x,timestamp,tick\n1,2000000000,7");
    expect(actual.labels).toStrictEqual(["x"]);
    expect(actual.time.toArray()).toStrictEqual([2]);
    expect(actual.channels.map((c) => c.toArray())).toStrictEqual([[1]]);
  });

  test("rejects a file without a header", () => {
    expect(() => parseCsv("1,1000000000,0.5,0.1,0.2,\n")).toThrow("header");
  });

  test("rejects an empty file", () => {
    expect(() => parseCsv("\n\n")).toThrow("empty");
  });

  test("rejects a header without channels", () => {
    expect(() => parseCsv("tick,timestamp,\n1,1,\n")).toThrow("channel");
  });

  test("rejects a header without data", () => {
    expect(() => parseCsv("tick,timestamp,ch1,\n")).toThrow("no data");
  });

  test("rejects a short line", () => {
    expect(() => parseCsv("tick,timestamp,ch1,\n1,1,\n")).toThrow("Line 2");
  });

  test("rejects an invalid timestamp", () => {
    expect(() => parseCsv("tick,timestamp,ch1,\n1,abc,0.1,\n")).toThrow(
      "timestamp",
    );
  });
});

test("lowerBound and upperBound", () => {
  const series = seriesOf([1, 2, 2, 3], [[0, 0, 0, 0]]);
  expect(lowerBound(series.time, 2)).toBe(1);
  expect(upperBound(series.time, 2)).toBe(3);
  expect(lowerBound(series.time, 0)).toBe(0);
  expect(upperBound(series.time, 9)).toBe(4);
  // Kept: 3, 4, 5 and 6, from the middle of the arrays on.
  const wrapped = seriesOf([1, 2, 3, 4, 5, 6], [[0, 0, 0, 0, 0, 0]], 4);
  expect(lowerBound(wrapped.time, 4)).toBe(1);
  expect(upperBound(wrapped.time, 5)).toBe(3);
  expect(lowerBound(wrapped.time, 0)).toBe(0);
  expect(upperBound(wrapped.time, 9)).toBe(4);
});

describe("sample store", () => {
  test("drops the oldest samples once full", () => {
    const actual = seriesOf([1, 2, 3, 4, 5], [[10, 20, 30, 40, 50]], 3);
    expect(actual.time.length).toBe(3);
    expect(actual.time.toArray()).toStrictEqual([3, 4, 5]);
    expect(actual.channels[0].toArray()).toStrictEqual([30, 40, 50]);
    expect(actual.ticks.toArray()).toStrictEqual([2, 3, 4]);
  });

  test("keeps nothing without room", () => {
    const actual = seriesOf([1, 2], [[10, 20]], 0);
    expect(actual.time.length).toBe(0);
  });

  test("calculateCapacity", () => {
    expect(calculateCapacity("512hz", 10)).toBe(307200);
    expect(calculateCapacity("64hz", 1)).toBe(3840);
    expect(() => calculateCapacity("fast", 1)).toThrow("sample rate");
  });
});

describe("sliceWindow", () => {
  const series = seriesOf(
    [0, 1, 2, 3, 4, 5, 6, 7],
    [
      [0, 5, 1, 1, 1, -3, 1, 1],
      [100, 100, 100, 100, 100, 100, 100, 100],
    ],
  );

  test("returns the samples in the window", () => {
    const actual = series.sliceWindow(1, 3, 100, [true, false]);
    expect(actual.data).toStrictEqual([
      [1, 2, 3],
      [5, 1, 1],
      [100, 100, 100],
    ]);
    expect(actual.lo).toBe(1);
    expect(actual.hi).toBe(5);
  });

  test("keeps each bucket's peaks when decimating", () => {
    const actual = series.sliceWindow(0, 7, 4, [true, true]);
    expect(actual.data).toStrictEqual([
      [0, 3, 4, 7],
      [0, 5, 1, -3],
      [100, 100, 100, 100],
    ]);
    expect(actual.lo).toBe(-3);
    expect(actual.hi).toBe(100);
  });

  test("gives each channel's stats from every sample", () => {
    // Drawn as is or decimated, the same samples count.
    for (const maxPoints of [100, 4]) {
      const [a, b] = series.sliceWindow(0, 7, maxPoints, [true, false]).stats;
      expect(a.min).toBe(-3);
      expect(a.max).toBe(5);
      expect(a.mean).toBeCloseTo(7 / 8, 12);
      // sqrt(39 / 8 - (7 / 8)^2)
      expect(a.rms).toBeCloseTo(Math.sqrt(4.109375), 12);
      expect(b).toStrictEqual({ min: 100, max: 100, mean: 100, rms: 0 });
    }
  });

  test("reads the kept samples in order once full", () => {
    // Kept: times 2 to 5, from the middle of the arrays on.
    const wrapped = seriesOf([0, 1, 2, 3, 4, 5], [[9, 9, 1, 2, 3, 4]], 4);
    for (const maxPoints of [100, 2]) {
      const actual = wrapped.sliceWindow(0, 9, maxPoints, [true]);
      expect(actual.lo).toBe(1);
      expect(actual.hi).toBe(4);
      expect(actual.stats[0].mean).toBeCloseTo(2.5, 12);
    }
    expect(wrapped.sliceWindow(3, 4, 100, [true]).data).toStrictEqual([
      [3, 4],
      [2, 3],
    ]);
    expect(wrapped.sliceWindow(0, 9, 2, [true]).data).toStrictEqual([
      [2, 5],
      [1, 4],
    ]);
  });

  test("keeps a small RMS on a large offset", () => {
    const offset = seriesOf([0, 1, 2, 3], [[1, 1.00001, 1, 1.00001]]);
    const [actual] = offset.sliceWindow(0, 3, 100, [true]).stats;
    expect(actual.mean).toBeCloseTo(1.000005, 12);
    expect(actual.rms).toBeCloseTo(0.000005, 12);
  });

  test("skips missing values in the stats", () => {
    const gappy = seriesOf([0, 1, 2], [[1, NaN, 3]]);
    const actual = gappy.sliceWindow(0, 2, 100, [true]);
    expect(actual.stats).toStrictEqual([{ min: 1, max: 3, mean: 2, rms: 1 }]);
  });

  test("has no stats without samples", () => {
    const actual = series.sliceWindow(10, 20, 100, [true, true]);
    expect(actual.stats[0]).toStrictEqual({
      min: Infinity,
      max: -Infinity,
      mean: NaN,
      rms: NaN,
    });
  });

  test("has no range without visible channels", () => {
    const actual = series.sliceWindow(0, 7, 100, [false, false]);
    expect(actual.lo).toBe(Infinity);
    expect(actual.hi).toBe(-Infinity);
  });
});

test("fitAxis", () => {
  expect(fitAxis(-2.1, 3.4)).toStrictEqual({ min: -4, max: 4, step: 2 });
  const narrow = fitAxis(0.9, 1.1);
  expect(narrow.min).toBeCloseTo(0.8);
  expect(narrow.max).toBeCloseTo(1.2);
  expect(narrow.step).toBeCloseTo(0.1);
  // No data gives +-1 around zero.
  const empty = fitAxis(Infinity, -Infinity);
  expect(empty.min).toBeLessThanOrEqual(-1);
  expect(empty.max).toBeGreaterThanOrEqual(1);
});

describe("range view", () => {
  test("follows the newest data with a fixed width", () => {
    expect(shownRange(liveView(), [0, 100])).toStrictEqual([70, 100]);
    expect(shownRange(liveView(), [0, 10])).toStrictEqual([0, 10]);
    expect(shownRange(liveView(), [1000, 1010])).toStrictEqual([1000, 1010]);
  });

  test("shows the whole data", () => {
    expect(shownRange(wholeView(), [0, 100])).toStrictEqual([0, 100]);
    expect(shownRange(wholeView(), [50, 100])).toStrictEqual([50, 100]);
    expect(isWholeRange(wholeView(), [0, 100])).toBe(true);
    expect(isWholeRange(liveView(), [0, 100])).toBe(false);
  });

  test("holds still once the end is dragged back", () => {
    const view = moveRangeEnd(liveView(), [0, 100], 80);
    expect(view.follow).toBe(false);
    expect(shownRange(view, [0, 200])).toStrictEqual([70, 80]);
    // Older samples dropped, but not its own.
    expect(shownRange(view, [60, 200])).toStrictEqual([70, 80]);
  });

  test("moves on with the oldest kept sample once its own are dropped", () => {
    const view = moveRangeEnd(liveView(), [0, 100], 80);
    expect(shownRange(view, [75, 200])).toStrictEqual([75, 85]);
  });

  test("follows again at the newest data", () => {
    const first = moveRangeEnd(liveView(), [0, 100], 80);
    const view = moveRangeEnd(first, [0, 100], 100);
    expect(view.follow).toBe(true);
    expect(shownRange(view, [0, 200])).toStrictEqual([170, 200]);
  });

  test("moving the start to the first sample selects the whole", () => {
    const view = moveRangeStart(liveView(), [0, 100], 0.2);
    expect(view.whole).toBe(true);
    expect(shownRange(view, [0, 300])).toStrictEqual([0, 300]);
  });

  test("keeps a minimum span", () => {
    const view = moveRangeStart(liveView(), [0, 100], 150);
    expect(shownRange(view, [0, 100])).toStrictEqual([99, 100]);
  });
});

test("formatAcceleration", () => {
  expect(axisDecimals(2)).toBe(0);
  expect(axisDecimals(0.25)).toBe(2);
  expect(axisDecimals(0.1)).toBe(1);
  expect(formatAcceleration(-4, 2)).toBe("−4 g");
  expect(formatAcceleration(0, 2)).toBe("0 g");
  expect(formatAcceleration(0.75, 0.25)).toBe("0.75 g");
  // Rounding noise around zero is not negative.
  expect(formatAcceleration(-1e-12, 0.1)).toBe("0.0 g");
});

test("appendSweeps", () => {
  const series = new SampleSeries(["ch1", "ch2", "ch3"], 10);
  series.appendSweeps([
    { tick: 7, timestamp: 2500000000, ch1: 1, ch2: 2, ch3: 3 },
  ]);
  expect(series.time.toArray()).toStrictEqual([2.5]);
  expect(series.ticks.toArray()).toStrictEqual([7]);
  expect(series.channels.map((c) => c.toArray())).toStrictEqual([
    [1],
    [2],
    [3],
  ]);
});

describe("CSV", () => {
  const text =
    "tick,timestamp,ch1,ch2,ch3,\n" +
    "1,1000000000,0.5,-0.25,1,\n" +
    "2,1002000000,0.75,NaN,1.5,\n";

  test("writes back what it read", () => {
    const series = parseCsv(text);
    expect(series.ticks.toArray()).toStrictEqual([1, 2]);
    expect(
      series.formatCsvHeader() + series.formatCsvRows(0, series.time.length),
    ).toBe(text);
  });

  test("writes a range of samples", () => {
    const series = parseCsv(text);
    expect(series.formatCsvRows(1, 2)).toBe("2,1002000000,0.75,NaN,1.5,\n");
  });

  test("writes the kept samples, oldest first", () => {
    const series = seriesOf([1, 2, 3], [[10, 20, 30]], 2);
    expect(series.formatCsvRows(0, series.time.length)).toBe(
      "1,2000000000,20,\n2,3000000000,30,\n",
    );
  });

  test("writes a timestamp to within a microsecond", () => {
    // As JSON.parse reads it from `vilo log show`.
    const expected = Number("1763000000123456789");
    const series = new SampleSeries(["ch1", "ch2", "ch3"], 1);
    series.appendSweeps([
      { tick: 1, timestamp: expected, ch1: 0, ch2: 0, ch3: 0 },
    ]);
    const actual = Number(series.formatCsvRows(0, 1).split(",")[1]);
    expect(Math.abs(actual - expected)).toBeLessThan(1000);
  });
});
