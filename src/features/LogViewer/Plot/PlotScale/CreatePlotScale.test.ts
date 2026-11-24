import type uPlot from "uplot";
import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createPlotScale } from "./CreatePlotScale";
import {
  SolidUplot,
  createPluginBus,
  UplotPluginFactory,
} from "@dschz/solid-uplot";
import { CursorPluginMessageBus } from "@dschz/solid-uplot/plugins";

type Range = { min: number; max: number };

// Mounts a SolidUplot chart (the same component Plot.tsx uses) with the given
// scale ranges and plugin. Must be called inside a reactive root; the chart is
// destroyed when that root is disposed.
const createFakePlot = (
  x: Range,
  y: Range,
  plugin: UplotPluginFactory<CursorPluginMessageBus>,
  onReady?: (plot: uPlot) => void,
) => {
  const dataLength = x.max - x.min + 1;
  const data: uPlot.AlignedData = [
    Array.from({ length: dataLength }, (_, i) => x.min + i),
    Array.from({ length: dataLength }, () => 0),
  ];
  return SolidUplot<CursorPluginMessageBus>({
    width: 150,
    height: 30,
    data,
    legend: { show: false },
    axes: [{ show: false }, { show: false }],
    scales: {
      x: { time: false },
      y: { range: [y.min, y.max] },
    },
    series: [{}, { stroke: "blue" }],
    plugins: [plugin],
    pluginBus: createPluginBus<CursorPluginMessageBus>(),
    onCreate(u) {
      onReady?.(u);
    },
  });
};

const FULL_X = { min: 0, max: 9 };
const FULL_Y = { min: -10, max: 10 };

describe("createPlotScale", () => {
  it("starts with zoom reset disabled", () => {
    createRoot((dispose) => {
      const { isZoomReset, yScale } = createPlotScale({
        xScale: () => undefined,
        yScale: () => undefined,
      });
      expect(isZoomReset()).toBe(true);
      expect(yScale()).toEqual({ min: 0, max: 0 });
      dispose();
    });
  });

  it("stores the initial y scale on ready", async () => {
    // SolidUplot creates the chart in an effect, which runs when the root
    // finishes, so create the root synchronously and await afterwards.
    const { yScale, dispose } = createRoot((dispose) => {
      const { plotScalePlugin, yScale } = createPlotScale({
        xScale: () => undefined,
        yScale: () => undefined,
      });
      createFakePlot(FULL_X, FULL_Y, plotScalePlugin());
      return { yScale, dispose };
    });
    // uPlot fires "ready" after its first commit, which runs in a microtask.
    await Promise.resolve();
    expect(yScale()).toEqual(FULL_Y);
    dispose();
  });

  it("enables zoom reset when y is zoomed in", async () => {
    let plot!: uPlot;
    const { isZoomReset, dispose } = createRoot((dispose) => {
      const { plotScalePlugin, isZoomReset } = createPlotScale({
        xScale: () => undefined,
        yScale: () => undefined,
      });
      createFakePlot(FULL_X, FULL_Y, plotScalePlugin(), (u) => {
        plot = u;
      });
      return { isZoomReset, dispose };
    });
    await Promise.resolve();
    plot.setScale("y", { min: 0, max: 1 });
    await Promise.resolve();
    expect(isZoomReset()).toBe(false);
    dispose();
  });

  it("enables zoom reset when x is zoomed in", async () => {
    let plot!: uPlot;
    const { isZoomReset, dispose } = createRoot((dispose) => {
      const { plotScalePlugin, isZoomReset } = createPlotScale({
        xScale: () => undefined,
        yScale: () => undefined,
      });
      createFakePlot(FULL_X, FULL_Y, plotScalePlugin(), (u) => {
        plot = u;
      });
      return { isZoomReset, dispose };
    });
    await Promise.resolve();
    plot.setScale("x", { min: 1, max: 3 });
    await Promise.resolve();
    expect(isZoomReset()).toBe(false);
    dispose();
  });
});
