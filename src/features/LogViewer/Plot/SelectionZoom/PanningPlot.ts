import uPlot from "uplot";
import { Accessor } from "solid-js";

export function panningPlot(props: {
  u: uPlot;
  e: MouseEvent;
  group: string;
  yScale?: Accessor<{ min: number; max: number }>;
}) {
  const xMin = 0;
  const xMax = props.u.data[0].length - 1;

  const left0 = props.e.clientX;

  const scXMin0 = props.u.scales.x.min!;
  const scXMax0 = props.u.scales.x.max!;

  const xUnitsPerPx = props.u.posToVal(1, "x") - props.u.posToVal(0, "x");

  const yMin =
    typeof props.yScale !== "undefined"
      ? props.yScale().min
      : (props.u.scales.y.min ?? 0);
  const yMax =
    typeof props.yScale !== "undefined"
      ? props.yScale().max
      : (props.u.scales.y.max ?? 0);

  const top0 = props.e.clientY;

  const scYMin0 = props.u.scales.y.min!;
  const scYMax0 = props.u.scales.y.max!;

  const yUnitsPerPx = props.u.posToVal(1, "y") - props.u.posToVal(0, "y");

  const onmove = (e: MouseEvent) => {
    e.preventDefault();

    const left1 = e.clientX;
    const dx = xUnitsPerPx * (left1 - left0);

    const minXBoundary = scXMin0 - dx;
    const maxXBoundary = scXMax0 - dx;

    let scaleXMin = minXBoundary;
    let scaleXMax = maxXBoundary;

    if (xMin >= minXBoundary) {
      scaleXMin = xMin;
      scaleXMax = scXMax0;
    } else if (xMax <= maxXBoundary) {
      scaleXMin = scXMin0;
      scaleXMax = xMax;
    }

    // Tilting (Vertical panning)
    const top1 = e.clientY;
    const topDx = yUnitsPerPx * (top1 - top0);

    const minYBoundary = scYMin0 - topDx;
    const maxYBoundary = scYMax0 - topDx;

    let scaleYMin = minYBoundary;
    let scaleYMax = maxYBoundary;

    if (yMin >= minYBoundary) {
      scaleYMin = yMin;
      scaleYMax = scYMax0;
    } else if (yMax <= maxYBoundary) {
      scaleYMin = scYMin0;
      scaleYMax = yMax;
    }

    uPlot.sync(props.group).plots.forEach((up) => {
      up.setScale("x", {
        min: scaleXMin,
        max: scaleXMax,
      });
      if (!up.cursor.event) {
        up.setScale("y", {
          min: up.scales.y.min!,
          max: up.scales.y.max!,
        });
      }
    });
    props.u.setScale("y", {
      min: scaleYMin,
      max: scaleYMax,
    });
  };

  const onup = () => {
    document.removeEventListener("mousemove", onmove);
    document.removeEventListener("mouseup", onup);
  };

  document.addEventListener("mousemove", onmove);
  document.addEventListener("mouseup", onup);
}
