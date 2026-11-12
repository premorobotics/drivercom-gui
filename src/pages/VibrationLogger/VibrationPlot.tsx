import {
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { IconArrowsMaximize } from "@tabler/icons-solidjs";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { globalState } from "~/store/GlobalState";
import { getComputedCSSVariableValue } from "~/utils/GetComputedCssVariableValue";
import {
  Axis,
  fitAxis,
  formatAcceleration,
  formatClock,
  isWholeRange,
  moveRangeEnd,
  moveRangeStart,
  overviewPath,
  RangeView,
  SampleSeries,
  shownRange,
  sliceWindow,
  wholeView,
} from "~/utils/VibrationData";
import { emptyBox, numeric } from "./styles";

type VibrationPlotProps = {
  series: SampleSeries;
  // Changes whenever samples are added to `series`.
  version: number;
  view: RangeView;
  onViewChange: (view: RangeView) => void;
  // New samples are coming in.
  live: boolean;
  // Nothing to show: the plot keeps its size and shows `children` instead.
  empty: boolean;
  children?: JSX.Element;
};

const lightColors = ["#3d63dd", "#f08c00", "#0d5c47"];
const darkColors = ["#849dff", "#ffa057", "#3dd68c"];
const axisNames: Record<string, string> = { ch1: "X", ch2: "Y", ch3: "Z" };

const legendItem = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  minHeight: "6",
  paddingX: "2",
  borderRadius: "4px",
  fontSize: "xs",
  textAlign: "left",
  whiteSpace: "nowrap",
  cursor: "pointer",
  color: "fg.default",
  _hover: { background: "gray.3" },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "accent.9",
    outlineOffset: "1px",
  },
  "&[aria-pressed=false]": { color: "fg.subtle" },
});

const thumb = {
  pointerEvents: "auto",
  width: "12px",
  height: "28px",
  borderRadius: "4px",
  background: "accent.9",
  border: "2px solid white",
  boxShadow: "0 1px 4px rgba(15, 18, 25, 0.35)",
  cursor: "ew-resize",
} as const;

const rangeInput = css({
  position: "absolute",
  left: "0",
  top: "0",
  width: "100%",
  height: "100%",
  margin: "0",
  background: "transparent",
  appearance: "none",
  WebkitAppearance: "none",
  pointerEvents: "none",
  "&::-webkit-slider-runnable-track": {
    height: "100%",
    background: "transparent",
  },
  "&::-moz-range-track": { height: "100%", background: "transparent" },
  "&::-webkit-slider-thumb": {
    ...thumb,
    WebkitAppearance: "none",
    appearance: "none",
    marginTop: "2px",
  },
  "&::-moz-range-thumb": { ...thumb, width: "8px", height: "26px" },
  "&:focus-visible::-webkit-slider-thumb": {
    outline: "2px solid",
    outlineColor: "accent.12",
    outlineOffset: "1px",
  },
  "&:focus-visible::-moz-range-thumb": {
    outline: "2px solid",
    outlineColor: "accent.12",
    outlineOffset: "1px",
  },
});

function formatSpan(seconds: number): string {
  if (seconds < 120) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// Acceleration over time of day, with a legend inside the plot that shows or
// hides each channel, and a two-handle range strip below it.
export function VibrationPlot(props: VibrationPlotProps) {
  let wrapper!: HTMLDivElement;
  let container!: HTMLDivElement;
  let plot: uPlot | undefined;

  const [visible, setVisible] = createSignal<boolean[]>([]);
  // Where uPlot draws, in CSS pixels from the wrapper's edges, so the legend,
  // the empty box and the range strip line up with it.
  const [area, setArea] = createSignal({
    left: 60,
    right: 0,
    top: 0,
    bottom: 30,
  });

  // The scales uPlot reads on every redraw.
  let axis: Axis = fitAxis(-1, 1);
  let xWindow: [number, number] = [0, 1];

  const firstTime = () => props.series.time[0] ?? Date.now() / 1000;
  const total = () => {
    void props.version;
    const time = props.series.time;
    return time.length > 1 ? time[time.length - 1] - time[0] : 0;
  };
  const shown = () => shownRange(props.view, total());

  const colors = () =>
    globalState.theme === "dark" ? darkColors : lightColors;

  const create = () => {
    plot?.destroy();
    const muted = getComputedCSSVariableValue("--colors-fg-muted");
    const grid = getComputedCSSVariableValue("--colors-gray-4");
    const axisStyle = {
      stroke: muted,
      grid: { stroke: grid, width: 1 },
      ticks: { stroke: grid, width: 1 },
      font: "12px 'Pretendard Variable', Pretendard, sans-serif",
    };
    plot = new uPlot(
      {
        width: Math.max(wrapper.clientWidth, 100),
        height: Math.max(wrapper.clientHeight, 100),
        legend: { show: false },
        cursor: { show: false, drag: { x: false, y: false, setScale: false } },
        scales: {
          x: { time: true, range: () => [xWindow[0], xWindow[1]] },
          y: { range: () => [axis.min, axis.max] },
        },
        axes: [
          {
            ...axisStyle,
            space: 90,
            values: (u, splits) => {
              const span = (u.scales.x.max ?? 0) - (u.scales.x.min ?? 0);
              return splits.map((v) => formatClock(v, span <= 10));
            },
          },
          {
            ...axisStyle,
            size: 60,
            splits: () => [0, 1, 2, 3, 4].map((i) => axis.min + i * axis.step),
            values: (_, splits) =>
              splits.map((v) => formatAcceleration(v, axis.step)),
          },
        ],
        series: [
          {},
          ...props.series.labels.map((label, i) => ({
            label,
            stroke: colors()[i % colors().length],
            width: 1.5,
            show: visible()[i] ?? true,
            points: { show: false },
          })),
        ],
        hooks: {
          draw: [
            (u) => {
              const r = uPlot.pxRatio;
              setArea({
                left: u.bbox.left / r,
                top: u.bbox.top / r,
                right: u.width - (u.bbox.left + u.bbox.width) / r,
                bottom: u.height - (u.bbox.top + u.bbox.height) / r,
              });
            },
          ],
        },
      },
      [[], ...props.series.labels.map(() => [])],
      container,
    );
  };

  const update = () => {
    if (!plot) return;
    const t0 = firstTime();
    const [start, end] = shown();
    const window = sliceWindow(
      props.series,
      t0 + start,
      t0 + end,
      Math.max(200, plot.width * 2),
      visible(),
    );
    axis = fitAxis(window.lo, window.hi);
    xWindow = end > start ? [t0 + start, t0 + end] : [t0, t0 + 1];
    plot.setData(window.data as uPlot.AlignedData);
  };

  onMount(() => {
    let labelsKey = "";
    // A new set of channels shows all of them; a theme change recolors.
    createEffect(
      on(
        () => [props.series.labels.join(","), globalState.theme],
        () => {
          const key = props.series.labels.join(",");
          if (key !== labelsKey) {
            labelsKey = key;
            setVisible(props.series.labels.map(() => true));
          }
          create();
          update();
        },
      ),
    );
    createEffect(
      on(() => [props.version, props.view, visible(), props.series], update, {
        defer: true,
      }),
    );

    const observer = new ResizeObserver(() => {
      if (plot && wrapper.clientWidth > 0 && wrapper.clientHeight > 0) {
        plot.setSize({
          width: wrapper.clientWidth,
          height: wrapper.clientHeight,
        });
        update();
      }
    });
    observer.observe(wrapper);
    onCleanup(() => {
      observer.disconnect();
      plot?.destroy();
    });
  });

  const toggle = (index: number) => {
    const next = [...visible()];
    next[index] = !next[index];
    setVisible(next);
    plot?.setSeries(index + 1, { show: next[index] });
  };

  const overview = createMemo(() => {
    void props.version;
    const series = props.series;
    return overviewPath(series.time, series.channels[0] ?? [], 300, 1000, 300);
  });

  const selection = () => {
    const max = Math.max(total(), 1);
    const [start, end] = shown();
    return { x: (start / max) * 1000, w: ((end - start) / max) * 1000 };
  };

  const rangeText = () => {
    const t0 = firstTime();
    const [start, end] = shown();
    let text = `${formatClock(t0 + start, false)} – ${formatClock(t0 + end, false)} (${formatSpan(end - start)})`;
    if (props.live && props.view.follow) {
      text += props.view.whole
        ? " · whole session, live"
        : " · following live data";
    }
    return text;
  };

  const hiddenWhenEmpty = () => ({
    visibility: props.empty ? ("hidden" as const) : ("visible" as const),
  });

  return (
    <figure
      style={{
        margin: "0",
        flex: "1",
        "min-height": "0",
        display: "flex",
        "flex-direction": "column",
        gap: "6px",
      }}
    >
      <div
        ref={wrapper}
        style={{ position: "relative", flex: "1", "min-height": "160px" }}
      >
        <div
          ref={container}
          role="img"
          aria-label="Acceleration of each channel over time"
          style={{ position: "absolute", inset: "0", ...hiddenWhenEmpty() }}
        />
        <Show when={props.empty}>
          <div
            class={emptyBox}
            style={{
              position: "absolute",
              left: `${area().left}px`,
              top: `${area().top}px`,
              right: `${area().right}px`,
              bottom: `${area().bottom}px`,
            }}
          >
            {props.children}
          </div>
        </Show>
        <div
          role="group"
          aria-label="Channels shown"
          class={css({
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            gap: "0.5",
            padding: "1",
            background: "gray.1",
            opacity: "0.92",
            borderWidth: "1px",
            borderColor: "border",
            borderRadius: "6px",
          })}
          style={{
            top: `${area().top + 8}px`,
            right: `${area().right + 8}px`,
            ...hiddenWhenEmpty(),
          }}
        >
          <For each={props.series.labels}>
            {(label, i) => (
              <button
                type="button"
                class={legendItem}
                aria-pressed={visible()[i()] ?? true}
                onClick={() => toggle(i())}
              >
                <span
                  style={{
                    width: "18px",
                    height: "3px",
                    "border-radius": "2px",
                    background:
                      (visible()[i()] ?? true)
                        ? colors()[i() % colors().length]
                        : "transparent",
                    "box-shadow":
                      (visible()[i()] ?? true)
                        ? "none"
                        : "inset 0 0 0 1px currentColor",
                  }}
                />
                {axisNames[label] ? `${label} (${axisNames[label]})` : label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div
        style={{
          flex: "none",
          display: "flex",
          "flex-direction": "column",
          gap: "4px",
          "margin-top": "4px",
          "margin-left": `${area().left}px`,
          "margin-right": `${area().right}px`,
          ...hiddenWhenEmpty(),
        }}
      >
        <div
          class={css({
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "2.5",
            flexWrap: "wrap",
            fontSize: "xs",
          })}
        >
          <span class={`${numeric} ${css({ fontWeight: "semibold" })}`}>
            {rangeText()}
          </span>
          <Button
            size="2xs"
            variant="outline"
            disabled={isWholeRange(props.view, total())}
            onClick={() => props.onViewChange(wholeView())}
          >
            <IconArrowsMaximize />
            Show all
          </Button>
        </div>
        <div style={{ position: "relative", height: "32px" }}>
          <div
            class={css({
              position: "absolute",
              top: "0",
              bottom: "0",
              left: "7px",
              right: "7px",
              borderWidth: "1px",
              borderColor: "border",
              borderRadius: "6px",
              background: "gray.2",
              overflow: "hidden",
            })}
          >
            <svg
              viewBox="0 0 1000 300"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
              }}
            >
              <path
                d={overview()}
                class={css({ fill: "fg.subtle", opacity: "0.5" })}
              />
              <rect
                x="0"
                y="0"
                width={selection().x}
                height="300"
                class={css({ fill: "gray.12", opacity: "0.08" })}
              />
              <rect
                x={selection().x}
                y="0"
                width={selection().w}
                height="300"
                class={css({ fill: "accent.9", opacity: "0.14" })}
              />
              <rect
                x={selection().x + selection().w}
                y="0"
                width={Math.max(0, 1000 - selection().x - selection().w)}
                height="300"
                class={css({ fill: "gray.12", opacity: "0.08" })}
              />
            </svg>
          </div>
          <input
            type="range"
            class={rangeInput}
            min="0"
            max={Math.max(total(), 1)}
            step="any"
            value={shown()[0]}
            aria-label="Range start"
            aria-valuetext={formatClock(firstTime() + shown()[0], false)}
            onInput={(e) =>
              props.onViewChange(
                moveRangeStart(
                  props.view,
                  total(),
                  Number(e.currentTarget.value),
                ),
              )
            }
          />
          <input
            type="range"
            class={rangeInput}
            min="0"
            max={Math.max(total(), 1)}
            step="any"
            value={shown()[1]}
            aria-label="Range end"
            aria-valuetext={formatClock(firstTime() + shown()[1], false)}
            onInput={(e) =>
              props.onViewChange(
                moveRangeEnd(
                  props.view,
                  total(),
                  Number(e.currentTarget.value),
                ),
              )
            }
          />
        </div>
      </div>
    </figure>
  );
}
