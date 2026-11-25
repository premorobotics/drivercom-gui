import { expect, test } from "vitest";
import { clamp } from "./Clamp";

test("Test clamp", () => {
  expect(clamp(20, 1, 10, 30, 2, 20)).toStrictEqual([2, 22]);
});
