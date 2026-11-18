import { describe, expect, test } from "vitest";
import { RingBuffer } from "./RingBuffer";

describe("RingBuffer", () => {
  test("keeps values in the order they came", () => {
    const actual = new RingBuffer<number>(4);
    actual.push(1);
    actual.push(2);
    expect(actual.length).toBe(2);
    expect(actual.isFull()).toBe(false);
    expect(actual.get(0)).toBe(1);
    expect(actual.get(1)).toBe(2);
    expect(actual.toArray()).toStrictEqual([1, 2]);
  });

  test("replaces the oldest value once full", () => {
    const actual = new RingBuffer<number>(3);
    [1, 2, 3, 4, 5].forEach((v) => actual.push(v));
    expect(actual.length).toBe(3);
    expect(actual.isFull()).toBe(true);
    expect(actual.get(0)).toBe(3);
    expect(actual.get(2)).toBe(5);
    expect(actual.toArray()).toStrictEqual([3, 4, 5]);
  });

  test("keeps going round", () => {
    const actual = new RingBuffer<number>(3);
    for (let v = 1; v <= 100; v++) {
      actual.push(v);
    }
    expect(actual.toArray()).toStrictEqual([98, 99, 100]);
  });

  test("keeps nothing without capacity", () => {
    const actual = new RingBuffer<number>(0);
    actual.push(1);
    expect(actual.length).toBe(0);
    expect(actual.toArray()).toStrictEqual([]);
  });

  test("rejects a value it does not hold", () => {
    const actual = new RingBuffer<number>(3);
    actual.push(1);
    expect(() => actual.get(1)).toThrow(RangeError);
    expect(() => actual.get(-1)).toThrow(RangeError);
  });
});
