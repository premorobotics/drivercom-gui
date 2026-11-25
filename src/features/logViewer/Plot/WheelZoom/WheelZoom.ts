import { UplotPluginFactory } from "@dschz/solid-uplot";
import { CursorPluginMessageBus } from "@dschz/solid-uplot/plugins";
import { CursorMode } from "../CursorMode/CreateCursorMode";
import uPlot from "uplot";
import { clamp } from "./Clamp";
import { Accessor } from "solid-js";

export type WheelZoomOptions = {
  factor?: number;
  group: () => string;
  cursorMode: Accessor<CursorMode>;
};

export function wheelZoomPlugin(
  opts: WheelZoomOptions,
): UplotPluginFactory<CursorPluginMessageBus> {
  return () => {
    const factor = opts.factor || 0.75;

    let xMin: number,
      xMax: number,
      xRange: number,
      yMin: number,
      yMax: number,
      yRange: number;

    return {
      hooks: {
        ready: (u) => {
          xMin = u.scales.x.min!;
          xMax = u.scales.x.max!;
          xRange = xMax - xMin;

          yMin = u.scales.y.min!;
          yMax = u.scales.y.max!;
          yRange = yMax - yMin;

          const over = u.over;

          // wheel scroll zoom
          over.addEventListener("wheel", (e) => {
            e.preventDefault();

            const { left, top } = u.cursor;

            const leftPct = left! / over.offsetWidth;
            const xVal = u.posToVal(left!, "x");
            const oxRange = u.scales.x.max! - u.scales.x.min!;

            let nxRange: number = 0;
            nxRange = e.deltaY < 0 ? oxRange * factor : oxRange / factor;
            if (e.shiftKey) {
              const deltaY = e.deltaX;
              nxRange = deltaY < 0 ? oxRange * factor : oxRange / factor;
            }
            let nxMin = xVal - leftPct * nxRange;
            let nxMax = nxMin + nxRange;
            [nxMin, nxMax] = clamp(nxRange, nxMin, nxMax, xRange, xMin, xMax);

            // y Zoom
            const btmPct = 1 - top! / over.offsetHeight;
            const yVal = u.posToVal(top!, "y");
            const oyRange = u.scales.y.max! - u.scales.y.min!;

            const nyRange = e.deltaY < 0 ? oyRange * factor : oyRange / factor;
            let nyMin = yVal - btmPct * nyRange;
            let nyMax = nyMin + nyRange;
            [nyMin, nyMax] = clamp(nyRange, nyMin, nyMax, yRange, yMin, yMax);

            if (opts.cursorMode() === CursorMode.Vertical) {
              u.setScale("y", { min: nyMin, max: nyMax });
            } else {
              uPlot.sync(opts.group()).plots.forEach((up: uPlot) => {
                up.setScale("x", { min: nxMin, max: nxMax });
                up.setScale("y", {
                  min: up.scales.y.min!,
                  max: up.scales.y.max!,
                });
              });
            }
          });
        },
      },
    };
  };
}
