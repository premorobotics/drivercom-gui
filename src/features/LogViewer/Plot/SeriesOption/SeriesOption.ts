import { LegendStroke } from "../PlotTypes";

export const STROKE_DASH: Record<LegendStroke, number[] | undefined> = {
  [LegendStroke.Line]: undefined,
  [LegendStroke.Dash]: [10, 5],
  [LegendStroke.Dot]: [0, 5],
};

export function toSeriesOptions(opts: {
  label: string;
  stroke: () => string;
  style: LegendStroke;
  show: boolean;
  dotFilter?: () => number[] | null;
}): uPlot.Series {
  const dash = STROKE_DASH[opts.style];
  return {
    label: opts.label,
    stroke: opts.stroke,
    show: opts.show,
    width: 1 / devicePixelRatio,
    ...(dash && {
      dash: STROKE_DASH[opts.style],
      ...(opts.style === LegendStroke.Dot && {
        points: {
          show: true,
          filter: opts.dotFilter,
        },
      }),
    }),
  };
}
