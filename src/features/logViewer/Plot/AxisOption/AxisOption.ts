import type uPlot from "uplot";

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

export function toAxesOptions(color: AxisColor): uPlot.Axis[] {
  const base: uPlot.Axis = {
    stroke: color.fg,
    grid: { stroke: color.grid },
    ticks: { stroke: color.grid },
  };
  return [base, { ...base, size: yAxisSize }];
}
