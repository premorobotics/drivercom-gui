import { describe, expect, it } from "vitest";
import { toSeriesOptions } from "./SeriesOption";
import { LegendStroke } from "../PlotTypes";

describe("Test Series Option.ts", () => {
  it("When the line style is line", () => {
    const opts = {
      label: "test",
      stroke: () => "#FFFFFF",
      style: LegendStroke.Line,
      show: true,
    };
    const seriesConfig = toSeriesOptions(opts);
    expect(seriesConfig).not.toHaveProperty("points");
    expect(seriesConfig).not.toHaveProperty("dash");
  });

  it("When the line style is dash", () => {
    const opts = {
      label: "test",
      stroke: () => "#FFFFFF",
      style: LegendStroke.Dash,
      show: true,
    };
    const seriesConfig = toSeriesOptions(opts);
    expect(seriesConfig.dash).toEqual([10, 5]);
    expect(seriesConfig).toHaveProperty("dash");
    expect(seriesConfig).not.toHaveProperty("points");
  });

  it("When the line style is dot", () => {
    const dotFilterDummyData = () => [0, 2, 4, 5];
    const opts = {
      label: "test",
      stroke: () => "#FFFFFF",
      style: LegendStroke.Dot,
      show: true,
      dotFilter: dotFilterDummyData,
    };
    const seriesConfig = toSeriesOptions(opts);
    expect(seriesConfig).toHaveProperty("dash");
    expect(seriesConfig).toHaveProperty("points");
    expect(seriesConfig.dash).toEqual([0, 5]);
    expect(seriesConfig.points?.filter).toBe(dotFilterDummyData);
    expect(seriesConfig.points).toHaveProperty("filter");
    expect(seriesConfig.points?.filter).not.toBeUndefined();
  });
});
