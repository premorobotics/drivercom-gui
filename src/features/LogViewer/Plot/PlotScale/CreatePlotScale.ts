import { UplotPluginFactory } from "@dschz/solid-uplot";
import { CursorPluginMessageBus } from "@dschz/solid-uplot/plugins";
import { Accessor, createSignal } from "solid-js";
import uPlot from "uplot";

type CreatePlotScaleProps = {
  xScale: () => [number, number] | undefined;
  yScale: () => { min: number; max: number } | undefined;
  onXScaleChange?: (xScale: [number, number]) => void;
  onYScaleChange?: (yScale: { min: number; max: number }) => void;
};

export function createPlotScale(props: CreatePlotScaleProps): {
  isZoomReset: Accessor<boolean>;
  plotScalePlugin: () => UplotPluginFactory<CursorPluginMessageBus>;
  yScale: Accessor<{ min: number; max: number }>;
  resetZoom: (plot: uPlot, group: string) => void;
} {
  const [isZoomReset, setIsZoomReset] = createSignal<boolean>(true);

  // Store the y scale min and max for reset the zoom
  const [yScale, setYScale] = createSignal<{ min: number; max: number }>({
    min: 0,
    max: 0,
  });

  const resetZoom = (plot: uPlot, group: string) => {
    uPlot.sync(group).plots.forEach((up: uPlot) => {
      const xMax = Number(up.data[0].length - 1);
      up.setScale("x", { min: 0, max: xMax });
    });
    plot.setScale("y", {
      min: yScale().min,
      max: yScale().max,
    });
  };
  const plotScalePlugin = (): UplotPluginFactory<CursorPluginMessageBus> => {
    return () => {
      // Set scale event triggered before ready. So it must need to check the plot is ready before update the scale.
      let isReady = false;

      return {
        hooks: {
          ready: (plot) => {
            setYScale({
              min: plot.scales.y.min!,
              max: plot.scales.y.max!,
            });

            const xScale = props.xScale();
            if (xScale) {
              plot.setScale("x", {
                min: xScale[0],
                max: xScale[1],
              });
            }

            const yScale = props.yScale();
            if (yScale) {
              plot.setScale("y", yScale);
            }
            isReady = true;
          },
          setScale: (plot, scaleKey) => {
            if (
              (typeof plot.scales.x.min !== "undefined" &&
                plot.scales.x.min > 0) ||
              (typeof plot.scales.x.max !== "undefined" &&
                plot.scales.x.max < plot.data[0].length - 1)
            ) {
              setIsZoomReset(false);
            } else {
              if (
                (typeof plot.scales.y.min !== "undefined" &&
                  plot.scales.y.min > yScale().min) ||
                (typeof plot.scales.y.max !== "undefined" &&
                  plot.scales.y.max < yScale().max)
              ) {
                setIsZoomReset(false);
              } else {
                setIsZoomReset(true);
              }
            }

            if (!isReady) return;
            if (scaleKey === "x") {
              if (
                typeof plot.scales.x.min === "number" &&
                typeof plot.scales.x.max === "number"
              ) {
                props.onXScaleChange?.([plot.scales.x.min, plot.scales.x.max]);
              }
            }

            if (scaleKey === "y") {
              if (
                typeof plot.scales.y.min === "number" &&
                typeof plot.scales.y.max === "number"
              ) {
                props.onYScaleChange?.({
                  min: plot.scales.y.min,
                  max: plot.scales.y.max,
                });
              }
            }
          },
        },
      };
    };
  };
  return {
    isZoomReset,
    plotScalePlugin,
    yScale,
    resetZoom,
  };
}
