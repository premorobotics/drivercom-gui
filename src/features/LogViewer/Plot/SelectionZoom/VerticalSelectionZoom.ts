import { Setter } from "solid-js";

export function verticalSelectionZoom(props: {
  u: uPlot;
  e: MouseEvent;
  group: string;
  setYMin: Setter<number | null>;
  setYMax: Setter<number | null>;
  setSelectionLeft: Setter<number | null>;
  setSelectionWidth: Setter<number | null>;
}) {
  const y0 = props.e.clientY;
  props.setYMin(props.e.clientY);
  const domRec = props.u.over.getBoundingClientRect();
  props.setSelectionLeft(domRec.x);
  props.setSelectionWidth(props.u.over.offsetWidth);

  let y1: number | null = null;
  const uOverTop = domRec.top;
  const uOverHeight = domRec.height;

  const onmove = (e: MouseEvent) => {
    y1 = e.clientY;
    const uPlotBottom = uOverTop + uOverHeight;
    if (y1 <= uOverTop) {
      props.setYMax(uOverTop);
    } else if (y1 >= uPlotBottom) {
      props.setYMax(uPlotBottom);
    } else {
      props.setYMax(y1);
    }
  };

  const onup = () => {
    if (y1) {
      let startNumber = Math.min(y0, y1);
      let endNumber = Math.max(y0, y1);
      if (endNumber - uOverTop >= uOverHeight) {
        endNumber = uOverTop + uOverHeight;
      }

      if (startNumber - uOverTop <= 0) {
        startNumber = uOverTop;
      }

      const cursorMin = startNumber - uOverTop;
      const cursorMax = endNumber - uOverTop;

      const scaleYMin = props.u.posToVal(cursorMin, "y");
      const scaleYMax = props.u.posToVal(cursorMax, "y");

      props.u.setScale("y", {
        min: scaleYMin,
        max: scaleYMax,
      });
    }

    props.setYMin(null);
    props.setYMax(null);
    props.setSelectionLeft(null);
    props.setSelectionWidth(null);

    document.removeEventListener("mousemove", onmove);
    document.removeEventListener("mouseup", onup);
  };

  document.addEventListener("mousemove", onmove);
  document.addEventListener("mouseup", onup);
}
