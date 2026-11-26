import type uPlot from "uplot";
import { decimalsForIncrement, formatTime } from "../TimeFormat";

export type AxisColor = {
  fg: string;
  grid: string;
};

// Y axis width grows with the longest tick label, but never below "999.999".
const yAxisSize: uPlot.Axis.Size = (self, values, axisIdx, cycleNum) => {
  const axis = self.axes[axisIdx]!;

  // bail out, force convergence
  if (cycleNum > 1) return axis["_size" as keyof typeof axis] as number;

  const baseAxisSize = axis.ticks!.size! + axis.gap!;

  // find longest value
  const longestVal = (values ?? []).reduce(
    (acc, val) => (val.length > acc.length ? val : acc),
    "",
  );

  let axisSize = baseAxisSize;
  if (longestVal != "") {
    self.ctx.font = axis.font![0];
    axisSize =
      baseAxisSize + self.ctx.measureText(longestVal).width / devicePixelRatio;
  }

  const minAxisSize =
    baseAxisSize + self.ctx.measureText("999.999").width / devicePixelRatio;
  return Math.max(Math.ceil(axisSize), minAxisSize);
};

// Time-only tick labels (uPlot's default adds a second line with the date).
// Decimals follow the tick spacing so zoomed-in ticks stay distinct.
const timeAxisValues: uPlot.Axis.DynamicValues = (
  _self,
  splits,
  _axisIdx,
  _foundSpace,
  foundIncr,
) => {
  const decimals = decimalsForIncrement(foundIncr);
  return splits.map((s) => formatTime(s, decimals));
};

const MIN_TIME_TICK_SPACE = 50;
const TIME_TICK_GAP = 16;

// Minimum pixels between time ticks, wide enough for the labels so they never
// overlap. uPlot picks a tick increment that is at least this many pixels
// wide, so the real increment is never smaller than the one estimated from
// MIN_TIME_TICK_SPACE and the real labels never need more decimals.
const timeAxisSpace: uPlot.Axis.Space = (
  self,
  axisIdx,
  scaleMin,
  scaleMax,
  plotDim,
) => {
  if (!(plotDim > 0) || !(scaleMax > scaleMin)) return MIN_TIME_TICK_SPACE;

  const minIncr = ((scaleMax - scaleMin) * MIN_TIME_TICK_SPACE) / plotDim;
  const decimals = decimalsForIncrement(minIncr);
  // Widest case for "HH:mm:ss.fff": every digit as wide as "8".
  const sample = "88:88:88" + (decimals > 0 ? "." + "8".repeat(decimals) : "");

  const font = self.axes[axisIdx]?.font;
  let labelWidth = sample.length * 8;
  if (font) {
    self.ctx.font = Array.isArray(font) ? font[0] : font;
    labelWidth = self.ctx.measureText(sample).width / devicePixelRatio;
  }

  return Math.max(MIN_TIME_TICK_SPACE, Math.ceil(labelWidth + TIME_TICK_GAP));
};

export function toAxesOptions(
  color: AxisColor,
  isTimeAxis = false,
): uPlot.Axis[] {
  const base: uPlot.Axis = {
    stroke: color.fg,
    grid: { stroke: color.grid },
    ticks: { stroke: color.grid },
  };
  const xAxis = isTimeAxis
    ? { ...base, values: timeAxisValues, space: timeAxisSpace }
    : base;
  return [xAxis, { ...base, size: yAxisSize }];
}
