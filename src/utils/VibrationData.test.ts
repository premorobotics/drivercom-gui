import { describe, expect, test } from "vitest";
import {
  appendSweeps,
  axisDecimals,
  createSeries,
  formatAcceleration,
  fitAxis,
  isWholeRange,
  liveView,
  lowerBound,
  moveRangeEnd,
  moveRangeStart,
  parseViloCsv,
  shownRange,
  sliceWindow,
  upperBound,
  wholeView,
} from "./VibrationData";

describe("parseViloCsv", () => {
  test("reads vilo's CSV with trailing commas", () => {
    const actual = parseViloCsv(
      "tick,timestamp,ch1,ch2,ch3,\n" +
        "1,1000000000,0.5,-0.25,1,\n" +
        "2,1002000000,0.75,0,1.5,\n",
    );
    expect(actual.labels).toStrictEqual(["ch1", "ch2", "ch3"]);
    expect(actual.time).toStrictEqual([1, 1.002]);
    expect(actual.channels).toStrictEqual([
      [0.5, 0.75],
      [-0.25, 0],
      [1, 1.5],
    ]);
  });

  test("keeps column names and order", () => {
    const actual = parseViloCsv("x,timestamp,tick\n1,2000000000,7");
    expect(actual.labels).toStrictEqual(["x"]);
    expect(actual.time).toStrictEqual([2]);
    expect(actual.channels).toStrictEqual([[1]]);
  });

  test("rejects a file without a header", () => {
    expect(() => parseViloCsv("1,1000000000,0.5,0.1,0.2,\n")).toThrow("header");
  });

  test("rejects an empty file", () => {
    expect(() => parseViloCsv("\n\n")).toThrow("empty");
  });

  test("rejects a header without channels", () => {
    expect(() => parseViloCsv("tick,timestamp,\n1,1,\n")).toThrow("channel");
  });

  test("rejects a header without data", () => {
    expect(() => parseViloCsv("tick,timestamp,ch1,\n")).toThrow("no data");
  });

  test("rejects a short line", () => {
    expect(() => parseViloCsv("tick,timestamp,ch1,\n1,1,\n")).toThrow("Line 2");
  });

  test("rejects an invalid timestamp", () => {
    expect(() => parseViloCsv("tick,timestamp,ch1,\n1,abc,0.1,\n")).toThrow(
      "timestamp",
    );
  });
});

test("lowerBound and upperBound", () => {
  const values = [1, 2, 2, 3];
  expect(lowerBound(values, 2)).toBe(1);
  expect(upperBound(values, 2)).toBe(3);
  expect(lowerBound(values, 0)).toBe(0);
  expect(upperBound(values, 9)).toBe(4);
});

describe("sliceWindow", () => {
  const series = {
    labels: ["a", "b"],
    time: [0, 1, 2, 3, 4, 5, 6, 7],
    channels: [
      [0, 5, 1, 1, 1, -3, 1, 1],
      [100, 100, 100, 100, 100, 100, 100, 100],
    ],
  };

  test("returns the samples in the window", () => {
    const actual = sliceWindow(series, 1, 3, 100, [true, false]);
    expect(actual.data).toStrictEqual([
      [1, 2, 3],
      [5, 1, 1],
      [100, 100, 100],
    ]);
    expect(actual.lo).toBe(1);
    expect(actual.hi).toBe(5);
  });

  test("keeps each bucket's peaks when decimating", () => {
    const actual = sliceWindow(series, 0, 7, 4, [true, true]);
    expect(actual.data).toStrictEqual([
      [0, 3, 4, 7],
      [0, 5, 1, -3],
      [100, 100, 100, 100],
    ]);
    expect(actual.lo).toBe(-3);
    expect(actual.hi).toBe(100);
  });

  test("has no range without visible channels", () => {
    const actual = sliceWindow(series, 0, 7, 100, [false, false]);
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
    expect(shownRange(liveView(), 100)).toStrictEqual([70, 100]);
    expect(shownRange(liveView(), 10)).toStrictEqual([0, 10]);
  });

  test("shows the whole data", () => {
    expect(shownRange(wholeView(), 100)).toStrictEqual([0, 100]);
    expect(isWholeRange(wholeView(), 100)).toBe(true);
    expect(isWholeRange(liveView(), 100)).toBe(false);
  });

  test("holds still once the end is dragged back", () => {
    const view = moveRangeEnd(liveView(), 100, 80);
    expect(view.follow).toBe(false);
    expect(shownRange(view, 200)).toStrictEqual([70, 80]);
  });

  test("follows again at the newest data", () => {
    const view = moveRangeEnd(moveRangeEnd(liveView(), 100, 80), 100, 100);
    expect(view.follow).toBe(true);
    expect(shownRange(view, 200)).toStrictEqual([170, 200]);
  });

  test("moving the start to the first sample selects the whole", () => {
    const view = moveRangeStart(liveView(), 100, 0.2);
    expect(view.whole).toBe(true);
    expect(shownRange(view, 300)).toStrictEqual([0, 300]);
  });

  test("keeps a minimum span", () => {
    const view = moveRangeStart(liveView(), 100, 150);
    expect(shownRange(view, 100)).toStrictEqual([99, 100]);
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
  const series = createSeries(["ch1", "ch2", "ch3"]);
  appendSweeps(series, [{ timestamp: 2_500_000_000, ch1: 1, ch2: 2, ch3: 3 }]);
  expect(series.time).toStrictEqual([2.5]);
  expect(series.channels).toStrictEqual([[1], [2], [3]]);
});
