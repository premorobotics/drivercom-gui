import { createEffect, createMemo, on } from "solid-js";
import type uPlot from "uplot";
import { LegendStroke, PlotContext } from "../PlotTypes";

export function createDotFilter(opts: {
  xScale: () => [number, number];
  ctx: PlotContext;
  plot: () => uPlot | undefined;
}) {
  // This memo update the dot filter whenever the plot's x range changes.
  // The dot filter prevents dot-styled storkes for being crammed together.
  // It uses an Nth-point decimation / stride sampling algorithm to compute the filter.
  const dotFilter = createMemo(
    on(
      () => [...opts.xScale()],
      ([xMin, xMax]) => {
        const plot = opts.plot();
        if (!plot) return [] as number[];

        const domainWidth: number = plot.over.offsetWidth;
        const xRange = xMax - xMin;
        const scale: number = xRange / domainWidth;
        if (scale <= 0.1) return [];

        const array: number[] = [];
        let i: number = 0;
        while (scale > 0.1) {
          array.push(i);
          i +=
            (Math.floor(scale) > 0
              ? Math.floor(scale)
              : parseFloat(scale.toFixed(1))) * 10;
          if (i >= plot.data[0].length) {
            break;
          }
        }
        return array;
      },
    ),
  );

  const checkDotFilter = () => (dotFilter().length > 0 ? dotFilter() : null);

  // This effect redraws the plot whenever the dot filter updates.
  createEffect(
    on(
      dotFilter,
      (df) => {
        const plot = opts.plot();
        if (!plot) return;
        if (opts.ctx.style.every((v) => v != LegendStroke.Dot)) return;

        if (df.length > 0) {
          opts.ctx.style.forEach((style, index) => {
            if (style === LegendStroke.Dot) {
              plot.series[index + 1].points!.filter = checkDotFilter;
            }
          });
          plot.redraw();
        } else {
          let need_redraw: boolean = false;
          plot.series.forEach((series) => {
            if (series.points?.filter === checkDotFilter) {
              series.points!.filter = () => null;
              need_redraw = true;
            }
          });
          if (need_redraw) plot.redraw();
        }
      },
      { defer: true },
    ),
  );

  return { checkDotFilter };
}
