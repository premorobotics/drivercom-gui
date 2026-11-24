import { Accessor, createSignal } from "solid-js";
import { CursorMode } from "../CursorMode/CreateCursorMode";
import uPlot from "uplot";
import { horizontalSelectionZoom } from "./HorizontalSelectionZoom";
import { panningPlot } from "./PanningPlot";
import { verticalSelectionZoom } from "./VerticalSelectionZoom";

export function createSelectionZoom(
  cursorMode: Accessor<CursorMode>,
  plotGroupId: () => string,
  yScale: Accessor<{ min: number; max: number }>,
) {
  const [yMin, setYMin] = createSignal<number | null>(null);
  const [yMax, setYMax] = createSignal<number | null>(null);
  const [selectionLeft, setSelectionLeft] = createSignal<number | null>(null);
  const [selectionWidth, setSelectionWidth] = createSignal<number | null>(null);

  const mouseDownHandler: uPlot.Cursor.MouseListenerFactory = (u) => {
    return (e) => {
      if (e.button == 0) {
        // Always release cursor lock if not control-clicking.
        if (cursorMode() !== CursorMode.Lock) {
          // @ts-ignore: TSC unable to detect `_lock` field
          if (u.cursor._lock) {
            uPlot.sync(plotGroupId()).plots.forEach((up) => {
              // @ts-ignore: TSC unable to detect `_lock` field
              up.cursor._lock = false;
            });
          }
        } else {
          // @ts-ignore: TSC unable to detect `_lock` field
          const new_lock = !u.cursor._lock;
          // Lock cursor in plot only when control-clicking.
          uPlot.sync(plotGroupId()).plots.forEach((up) => {
            // @ts-ignore: TSC unable to detect `_lock` field
            up.cursor._lock = new_lock;
          });
          return null;
        }

        if (cursorMode() === CursorMode.Horizontal) {
          horizontalSelectionZoom({
            u,
            e,
            group: plotGroupId(),
            setYMin,
            setYMax,
            setSelectionLeft,
            setSelectionWidth,
          });
        } else if (cursorMode() === CursorMode.Pan) {
          panningPlot({
            u,
            e,
            group: plotGroupId(),
            yScale,
          });
        } else if (cursorMode() === CursorMode.Vertical) {
          verticalSelectionZoom({
            u,
            e,
            group: plotGroupId(),
            setYMin,
            setYMax,
            setSelectionLeft,
            setSelectionWidth,
          });
        }
      }
      return null;
    };
  };

  const mouseUpHandler: uPlot.Cursor.MouseListenerFactory = (
    u,
    _targ,
    handler,
  ) => {
    return (e) => {
      if (e.button == 0) {
        // Prevent accidental micro-drags.
        if (u.select.width < 10) {
          u.select.width = 0;
        }
        handler(e);
      }
      return null;
    };
  };

  const dblClickHandler: uPlot.Cursor.MouseListenerFactory = (u) => {
    return (e) => {
      e.stopPropagation();

      if (cursorMode() === CursorMode.Horizontal) {
        uPlot.sync(plotGroupId()).plots.forEach((up) => {
          up.setScale("y", {
            min: up.scales.y.min!,
            max: up.scales.y.max!,
          });
          up.setScale("x", {
            min: 0,
            max: u.data[0].length - 1,
          });
        });
      } else if (cursorMode() === CursorMode.Vertical) {
        uPlot.sync(plotGroupId()).plots.forEach((up) => {
          up.setScale("y", {
            min: yScale().min,
            max: yScale().max,
          });
          up.setScale("x", {
            min: up.scales.x.min!,
            max: up.scales.x.max!,
          });
        });
      } else {
        uPlot.sync(plotGroupId()).plots.forEach((up) => {
          up.setScale("y", {
            min: up.scales.y.min!,
            max: up.scales.y.max!,
          });
          up.setScale("x", {
            min: 0,
            max: u.data[0].length - 1,
          });
        });
      }
      return null;
    };
  };

  return {
    mouseDownHandler,
    mouseUpHandler,
    dblClickHandler,
    yMin,
    yMax,
    selectionLeft,
    selectionWidth,
  };
}
