import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";

import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/store/GlobalState";
import { IconButton } from "~/components/ui/icon-button";
import {
  IconChevronLeftPipe,
  IconChevronRightPipe,
} from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { LegendStroke, PlotContext } from "./PlotTypes";
import { Portal } from "solid-js/web";
import * as Splitter from "~/components/ui/splitter";
import type { CursorPluginMessageBus } from "@dschz/solid-uplot/plugins";
import { SolidUplot, createPluginBus } from "@dschz/solid-uplot";
import { cursor, tooltip } from "@dschz/solid-uplot/plugins";
import { PlotToolTip } from "./PlotTooltip";
import { COLOR_PALETTE } from "./ColorPalette";
import { createCursorMode, CursorMode } from "./CursorMode/CreateCursorMode";
import { createDotFilter } from "./DotFilter/CreateDotFilter";
import { createSelectionZoom } from "./SelectionZoom/CreateSelectionZoom";
import { wheelZoomPlugin } from "./WheelZoom/WheelZoom";
import { LegendList } from "./LegendList";
import { toSeriesOptions } from "./SeriesOption/SeriesOption";
import { getComputedCSSVariableValue } from "~/utils/GetComputedCssVariableValue";
import { createSearchSeries } from "./SearchSeries/CreateSearchSeries";
import { createLegendPanelSize } from "./LegendPanelSize/CreateLegendPanelSize";
import { createPlotScale } from "./PlotScale/CreatePlotScale";
import { toAxesOptions } from "./AxisOption/AxisOption";
import { PlotToolbox } from "./PlotToolbox";
import { LegendToolbar } from "./LegendToolbar";

export type PlotProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  group?: string;
  header: string[];
  series: number[][];
  legendPanelMinWidth?: number;
  enumMapping?: Map<string, Map<number, string>>;
  context?: PlotContext;
  onContextChange?: (context: PlotContext) => void;
  xScale?: [number, number];
  onXScaleChange?: (xRange: [number, number]) => void;
  yScale?: { min: number; max: number };
  onYScaleChange?: (yScale: { min: number; max: number }) => void;
  legendPanelWidthPx?: number;
  onLegendPanelWidthPx?: (widthPx: number) => void;
  legendShrink?: boolean;
  onLegendShrinkChange?: (isShrink: boolean) => void;
};

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, [
    "header",
    "series",
    "group",
    "legendPanelMinWidth",
    "enumMapping",
    "id",
    "context",
    "onContextChange",
    "xScale",
    "onXScaleChange",
    "yScale",
    "onYScaleChange",
    "onLegendPanelWidthPx",
    "legendPanelWidthPx",
    "legendShrink",
    "onLegendShrinkChange",
  ]);
  const { globalState } = useContext(GlobalStateContext)!;

  const [render, setRender] = createSignal(false);
  const [cursorIdx, setCursorIdx] = createSignal<number | null>(null);
  let plot: uPlot;

  const group = () => props.group ?? props.id ?? "";

  const [ctx, setCtx] = createStore<PlotContext>({
    visible: [],
    color: [],
    style: [],
    selected: [],
  });
  createEffect(
    on(
      () => props.context,
      (context) => {
        const header = props.header;
        const n = header.length;
        const newCtx: PlotContext = {
          color:
            typeof context !== "undefined" &&
            context.color &&
            context.color.length === n
              ? [...context.color]
              : header.map((_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length]),
          style:
            context && context.style && context.style.length === n
              ? [...context.style]
              : header.map(() => LegendStroke.Line),
          visible:
            context && context.visible && context.visible.length === n
              ? [...context.visible]
              : header.map(() => true),
          selected: header.map(() => false),
        };
        setCtx(reconcile(newCtx));
        props.onContextChange?.(structuredClone(newCtx));
      },
    ),
  );
  const { isZoomReset, plotScalePlugin, yScale, resetZoom } = createPlotScale({
    xScale: () => props.xScale,
    yScale: () => props.yScale,
    onXScaleChange: (newScale) => props.onXScaleChange?.(newScale),
    onYScaleChange: (newScale) => props.onYScaleChange?.(newScale),
  });

  const { checkDotFilter } = createDotFilter({
    xScale: () => props.xScale ?? [0, props.series[0].length - 1],
    ctx,
    plot: () => plot,
  });

  const color = createMemo(
    on(
      () => globalState.theme,
      () => {
        return {
          fg: getComputedCSSVariableValue("--colors-fg-default"),
          grid: getComputedCSSVariableValue("--colors-gray-3"),
        };
      },
    ),
  );

  const selection_css = `
    .u-select {
      background: var(--colors-fg-subtle);
      opacity: 0.1;
    }
  `;

  const { searchInput, setSearchInput, legendIndex } = createSearchSeries(
    props.header,
  );

  const [showLegendCheckBox, setShowLegendCheckBox] =
    createSignal<boolean>(false);

  const bus = createPluginBus<CursorPluginMessageBus>();

  const [isPointerOverLegend, setIsPointerOverLegend] =
    createSignal<boolean>(false);
  const cursorMode = createCursorMode({
    isShortcutBlocked: (key) => key === "Shift" && isPointerOverLegend(),
  });
  const {
    mouseDownHandler,
    mouseUpHandler,
    dblClickHandler,
    yMin,
    yMax,
    selectionLeft,
    selectionWidth,
  } = createSelectionZoom(cursorMode.mode, group, yScale);

  const { rootObserver, size, resize } = createLegendPanelSize({
    legendPanelMinWidth: () => props.legendPanelMinWidth,
    legendPanelWidthPx: () => props.legendPanelWidthPx,
    onLegendPanelWidthPx: (newWidth) => props.onLegendPanelWidthPx?.(newWidth),
    onLegendShrinkChange: (newStatus) =>
      props.onLegendShrinkChange?.(newStatus),
  });

  return (
    <>
      <Splitter.Root
        {...rest}
        ref={(el) => rootObserver.observe(el)}
        background="bg.default"
        id={`splitter-${props.id}`}
        panels={[{ id: `plot-${props.id}` }, { id: `legend-${props.id}` }]}
        size={size()}
        onResize={(details) => {
          resize(details.size[1]);
        }}
      >
        <Splitter.Panel
          id={`plot-${props.id}`}
          borderWidth="0"
          gap="0"
          padding="0"
        >
          <div
            id={props.id}
            style={{ width: `calc(100% - 2.5rem)`, height: "100%" }}
            onMouseLeave={() => {
              if (cursorMode.mode() !== CursorMode.Lock) {
                setCursorIdx(null);
              }
            }}
          >
            <SolidUplot
              onCreate={(newPlot) => {
                plot = newPlot;
                setRender(true);
              }}
              onCursorMove={(e) => {
                setCursorIdx(e.cursor.xValue);
              }}
              cursor={{
                sync: {
                  key: group(),
                },
                bind: {
                  mousedown: mouseDownHandler,
                  mouseup: mouseUpHandler,
                  dblclick: dblClickHandler,
                },
              }}
              autoResize={true}
              axes={toAxesOptions(color())}
              data={[
                Array.from({ length: props.series[0].length }, (_, i) => i), // x values
                ...props.series,
              ]}
              scales={{
                x: {
                  time: false,
                },
              }}
              series={
                plot! && plot.series
                  ? plot.series
                  : [
                      {
                        label: "Cycle",
                        stroke: "#ffffff",
                      },
                      ...props.header.map((_, index) => {
                        return toSeriesOptions({
                          label: props.header[index],
                          stroke: () => unwrap(ctx).color[index],
                          show: unwrap(ctx).visible[index],
                          style: unwrap(ctx).style[index],
                          dotFilter: checkDotFilter,
                        });
                      }),
                    ]
              }
              plugins={[
                cursor(),
                wheelZoomPlugin({
                  factor: 0.75,
                  group: group,
                  cursorMode: cursorMode.mode,
                }),
                plotScalePlugin(),
                tooltip((tooltipProps) =>
                  PlotToolTip({
                    ...tooltipProps,
                    enumMapping: props.enumMapping,
                  }),
                ),
              ]}
              pluginBus={bus}
            />
          </div>

          <style>{selection_css}</style>
          <IconButton
            size="sm"
            padding="0"
            variant="plain"
            onClick={() => {
              props.onLegendShrinkChange?.(!props.legendShrink);
            }}
            marginRight={props.legendShrink ? "1em" : "0em"}
          >
            <Show when={props.legendShrink} fallback={<IconChevronRightPipe />}>
              <IconChevronLeftPipe />
            </Show>
          </IconButton>
        </Splitter.Panel>
        <Show when={!props.legendShrink}>
          <Splitter.ResizeTrigger
            id={`plot-${props.id}:legend-${props.id}`}
            opacity="0%"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "100%")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0%")}
          />
        </Show>

        <Show when={!props.legendShrink}>
          <Splitter.Panel
            id={`legend-${props.id}`}
            borderWidth="0"
            style={{
              width: "100%",
              height: "100%",
              padding: "0",
              "align-items": "normal",
              "border-radius": "0",
            }}
            flexDir={"column"}
          >
            <PlotToolbox
              id={props.id}
              isZoomReset={isZoomReset()}
              onZoomReset={() => resetZoom(plot, group())}
              cursorMode={cursorMode.mode()}
              baseCursorMode={cursorMode.baseMode()}
              onCursorModeChange={cursorMode.select}
            />
            <LegendToolbar
              searchInput={searchInput()}
              onSearchInputChange={setSearchInput}
              showCheckbox={showLegendCheckBox()}
              onShowCheckboxToggle={() => {
                if (showLegendCheckBox()) {
                  setCtx(
                    "selected",
                    props.header.map(() => false),
                  );
                }
                setShowLegendCheckBox(!showLegendCheckBox());
              }}
            />
            <Stack
              style={{
                "padding-bottom": "0.5em",
                width: "100%",
                "margin-right": "1em",
                position: "relative",
                height: `calc(100% - 5em)`,
                "overflow-x": "auto",
                "overflow-y": "auto",
                gap: 0,
                "padding-left": "0.5rem",
              }}
              onMouseEnter={() => {
                setIsPointerOverLegend(true);
                cursorMode.reset();
              }}
              onMouseLeave={(e) => {
                if (e.shiftKey) {
                  cursorMode.setMode(CursorMode.Horizontal);
                }
                setIsPointerOverLegend(false);
              }}
            >
              <Show when={render()}>
                <LegendList
                  ctx={ctx}
                  setCtx={setCtx}
                  plot={plot!}
                  onContextChange={(newCtx) => {
                    props.onContextChange?.(structuredClone(unwrap(newCtx)));
                  }}
                  showLegendCheckbox={showLegendCheckBox()}
                  enumMapping={props.enumMapping}
                  checkDotFilter={checkDotFilter}
                  cursorIdx={cursorIdx()}
                  header={props.header}
                  legendIndex={legendIndex()}
                  group={group()}
                />
              </Show>
            </Stack>
          </Splitter.Panel>
        </Show>
      </Splitter.Root>
      <Show when={yMin() && yMax()}>
        <Portal>
          <Stack
            position="absolute"
            pointerEvents="none"
            backgroundColor="fg.subtle"
            style={{
              top: `${Math.min(yMax()!, yMin()!)}px`,
              left: `${selectionLeft()}px`,
              width: `${selectionWidth()}px`,
              height: `${Math.max(yMax()!, yMin()!) - Math.min(yMax()!, yMin()!)}px`,
              opacity: "0.1",
            }}
          />
        </Portal>
      </Show>
    </>
  );
}
