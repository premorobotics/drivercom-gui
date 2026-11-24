import uPlot from "uplot";
import { Setter } from "solid-js";

export function horizontalSelectionZoom(props: {
  u: uPlot;
  e: MouseEvent;
  group: string;
  setYMin: Setter<number | null>;
  setYMax: Setter<number | null>;
  setSelectionLeft: Setter<number | null>;
  setSelectionWidth: Setter<number | null>;
}) {
  const domRect = props.u.over.getBoundingClientRect();
  const uPlotDivLeft = domRect.left;
  const uPlotDivTop = domRect.y;
  const uPlotDivWidth = domRect.width;

  const clientX0 = props.e.clientX;
  const left0 = props.u.posToVal(clientX0 - uPlotDivLeft, "x");
  props.setYMin(uPlotDivTop);
  props.setYMax(uPlotDivTop + domRect.height);

  let clientX1 = props.e.clientX;
  const onmove = (e: MouseEvent) => {
    if (e.clientX <= uPlotDivLeft) {
      clientX1 = uPlotDivLeft;
    } else if (e.clientX >= uPlotDivLeft + uPlotDivWidth) {
      clientX1 = uPlotDivLeft + uPlotDivWidth;
    } else {
      clientX1 = e.clientX;
    }

    props.setSelectionLeft(Math.min(clientX0, clientX1));
    props.setSelectionWidth(
      Math.max(clientX0, clientX1) - Math.min(clientX0, clientX1),
    );
  };

  const onup = () => {
    const left1 = props.u.posToVal(clientX1 - uPlotDivLeft, "x");
    uPlot.sync(props.group).plots.forEach((up) => {
      up.setScale("y", {
        min: up.scales.y.min!,
        max: up.scales.y.max!,
      });
      up.setScale("x", {
        min: Math.min(left0, left1),
        max: Math.max(left0, left1),
      });
    });

    props.setYMax(null);
    props.setYMin(null);
    props.setSelectionWidth(null);
    props.setSelectionLeft(null);

    document.removeEventListener("mousemove", onmove);
    document.removeEventListener("mouseup", onup);
  };

  document.addEventListener("mousemove", onmove);
  document.addEventListener("mouseup", onup);
}
