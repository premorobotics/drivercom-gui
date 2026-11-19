import { describe, expect, test } from "vitest";
import { RingBuffer } from "./RingBuffer";

describe("RingBuffer", () => {
  test("keeps values in the order they came", () => {
    const actual = new RingBuffer(4);
    actual.push(1);
    actual.push(2);
    expect(actual.length).toBe(2);
    expect(actual.isFull()).toBe(false);
    expect(actual.get(0)).toBe(1);
    expect(actual.get(1)).toBe(2);
    expect(actual.toArray()).toStrictEqual([1, 2]);
  });

  test("replaces the oldest value once full", () => {
    const actual = new RingBuffer(3);
    [1, 2, 3, 4, 5].forEach((v) => actual.push(v));
    expect(actual.length).toBe(3);
    expect(actual.isFull()).toBe(true);
    expect(actual.get(0)).toBe(3);
    expect(actual.get(2)).toBe(5);
    expect(actual.toArray()).toStrictEqual([3, 4, 5]);
  });

  test("keeps going round", () => {
    const actual = new RingBuffer(3);
    for (let v = 1; v <= 100; v++) {
      actual.push(v);
    }
    expect(actual.toArray()).toStrictEqual([98, 99, 100]);
  });

  test("keeps nothing without capacity", () => {
    const actual = new RingBuffer(0);
    actual.push(1);
    expect(actual.length).toBe(0);
    expect(actual.toArray()).toStrictEqual([]);
  });

  test("rejects a value it does not hold", () => {
    const actual = new RingBuffer(3);
    actual.push(1);
    expect(() => actual.get(1)).toThrow(RangeError);
    expect(() => actual.get(-1)).toThrow(RangeError);
  });
});

describe("getSlice", () => {
  test("copies a run of values", () => {
    const ring = new RingBuffer(5);
    [1, 2, 3, 4].forEach((v) => ring.push(v));
    const actual = ring.getSlice(1, 3);
    expect(actual).toStrictEqual(new Float64Array([2, 3]));
  });

  test("copies a run that continues at the start of the buffer", () => {
    // Held: 4 to 8, with 7 and 8 written at the start of the buffer.
    const ring = new RingBuffer(5);
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((v) => ring.push(v));
    expect(ring.getSlice(0, 5)).toStrictEqual(
      new Float64Array([4, 5, 6, 7, 8]),
    );
    expect(ring.getSlice(1, 4)).toStrictEqual(new Float64Array([5, 6, 7]));
    expect(ring.getSlice(3, 5)).toStrictEqual(new Float64Array([7, 8]));
  });

  test("is a copy", () => {
    const ring = new RingBuffer(2);
    [1, 2].forEach((v) => ring.push(v));
    const actual = ring.getSlice(0, 2);
    ring.push(3);
    expect(actual).toStrictEqual(new Float64Array([1, 2]));
  });

  test("copies nothing from an empty run", () => {
    expect(new RingBuffer(0).getSlice(0, 0)).toStrictEqual(new Float64Array());
    const ring = new RingBuffer(3);
    ring.push(1);
    expect(ring.getSlice(1, 1)).toStrictEqual(new Float64Array());
  });

  test("rejects values it does not hold", () => {
    const ring = new RingBuffer(3);
    [1, 2].forEach((v) => ring.push(v));
    expect(() => ring.getSlice(-1, 1)).toThrow(RangeError);
    expect(() => ring.getSlice(0, 3)).toThrow(RangeError);
    expect(() => ring.getSlice(2, 1)).toThrow(RangeError);
  });
});

describe("pushSlice", () => {
  test("adds values in order", () => {
    const actual = new RingBuffer(5);
    actual.pushSlice([1, 2, 3]);
    expect(actual.length).toBe(3);
    expect(actual.toArray()).toStrictEqual([1, 2, 3]);
  });

  test("replaces the oldest values once full", () => {
    const actual = new RingBuffer(5);
    [1, 2, 3, 4].forEach((v) => actual.push(v));
    actual.pushSlice([5, 6, 7]);
    expect(actual.isFull()).toBe(true);
    expect(actual.toArray()).toStrictEqual([3, 4, 5, 6, 7]);
  });

  test("keeps the newest of more values than the capacity", () => {
    const actual = new RingBuffer(3);
    actual.push(1);
    actual.pushSlice([2, 3, 4, 5, 6]);
    expect(actual.toArray()).toStrictEqual([4, 5, 6]);
  });

  test("matches pushing one by one", () => {
    const actual = new RingBuffer(7);
    const expected = new RingBuffer(7);
    let next = 0;
    for (let step = 0; step < 50; step++) {
      // 0 to 9 values: none, fewer and more than the capacity.
      const values = Array.from({ length: (step * 3) % 10 }, () => next++);
      actual.pushSlice(values);
      values.forEach((v) => expected.push(v));
      expect(actual.toArray()).toStrictEqual(expected.toArray());
    }
  });

  test("keeps nothing without capacity", () => {
    const actual = new RingBuffer(0);
    actual.pushSlice([1, 2]);
    expect(actual.length).toBe(0);
  });
});
