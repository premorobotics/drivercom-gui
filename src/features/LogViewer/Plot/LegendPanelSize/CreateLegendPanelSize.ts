import { createMemo, createSignal, onCleanup } from "solid-js";

type createLegendPanelSizeProps = {
  legendPanelWidthPx: () => number | undefined;
  legendPanelMinWidth: () => number | undefined;
  onLegendPanelWidthPx?: (legendPanelSize: number) => void;
  onLegendShrinkChange?: (legendShrink: boolean) => void;
};

export function createLegendPanelSize(props: createLegendPanelSizeProps) {
  const [rootWidth, setRootWidth] = createSignal<number>(0);
  const rootObserver = new ResizeObserver((entry) => {
    const element = entry[0];
    const rect = element.contentRect;
    setRootWidth(rect.width);
  });

  const convertPixelToPercent = (rootWidth: number, elementWidth: number) => {
    return (elementWidth / rootWidth) * 100;
  };

  const convertPercentToPixel = (percent: number, rootWidth: number) => {
    return rootWidth * percent * 0.01;
  };

  const size = createMemo(() => {
    return [
      100 -
        convertPixelToPercent(
          rootWidth(),
          props.legendPanelWidthPx?.() ?? props.legendPanelMinWidth?.() ?? 0,
        ),
      convertPixelToPercent(
        rootWidth(),
        props.legendPanelWidthPx?.() ?? props.legendPanelMinWidth?.() ?? 0,
      ),
    ];
  });

  const resize = (widthPx: number) => {
    const legendPanelSize = convertPercentToPixel(widthPx, rootWidth());
    const legendPanelMinWidth = props.legendPanelMinWidth?.();
    if (legendPanelMinWidth) {
      if (legendPanelSize > legendPanelMinWidth) {
        props.onLegendPanelWidthPx?.(legendPanelSize);
        props.onLegendShrinkChange?.(false);
      } else {
        const legendMinWidhtSizeQuater = legendPanelMinWidth * 0.25;
        if (legendPanelSize > legendMinWidhtSizeQuater) {
          props.onLegendPanelWidthPx?.(legendPanelMinWidth);
          props.onLegendShrinkChange?.(false);
        } else {
          props.onLegendPanelWidthPx?.(0);
          props.onLegendShrinkChange?.(true);
        }
      }
    }
  };

  onCleanup(() => {
    rootObserver.disconnect();
  });

  return {
    size,
    resize,
    rootObserver,
  };
}
