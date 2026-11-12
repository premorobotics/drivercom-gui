import {
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import {
  IconArrowRight,
  IconChartLine,
  IconDownload,
  IconFile,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconPlug,
  IconRefresh,
  IconX,
} from "@tabler/icons-solidjs";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { toaster } from "~/components/ui/toast";
import { FileHandler } from "~/services/FileHandler";
import * as vilo from "~/services/ViloService";
import {
  appendSweeps,
  createSeries,
  formatClock,
  formatDuration,
  liveView,
  parseViloCsv,
  RangeView,
  SampleSeries,
  wholeView,
} from "~/utils/VibrationData";
import { BaseStationCard, sessionLockText } from "./BaseStationCard";
import { Tip, TipLayer } from "./CursorTip";
import { NodeCard, NodeState } from "./NodeCard";
import { OptionSelect } from "./OptionSelect";
import { VibrationPlot } from "./VibrationPlot";
import { emptyBox, hint, notice, numeric } from "./styles";

type Stage = "detecting" | "noBase" | "ready";
// What the plot shows: nothing, the running session, the session that just
// ended, or a loaded CSV file.
type Source = "none" | "live" | "ended" | "csv";
type Session = { log: vilo.LogProcess; paused: boolean };
type SelectedNode = { address: number; model: string | null };

const liveLabels = ["ch1", "ch2", "ch3"];
const pollInterval = 250;
const storeKey = "viloLastNode";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fileName = (path: string) => path.replaceAll("\\", "/").split("/").pop();

function toastError(title: string, e: unknown) {
  toaster.create({ title, description: messageOf(e), type: "error" });
}

function toastInfo(title: string) {
  toaster.create({ title, type: "success" });
}

async function openStore() {
  return await load("store.json", { autoSave: false, defaults: {} });
}

async function loadLastNode(): Promise<SelectedNode | null> {
  try {
    const node = await (await openStore()).get<SelectedNode>(storeKey);
    return node && typeof node.address === "number" ? node : null;
  } catch {
    return null;
  }
}

async function saveLastNode(node: SelectedNode) {
  try {
    const store = await openStore();
    await store.set(storeKey, node);
    await store.save();
  } catch {
    // Only a convenience for the next visit.
  }
}

const logFields: { key: keyof vilo.LogConfig; label: string }[] = [
  { key: "sample_rate", label: "Sample rate" },
  { key: "input_range", label: "Input range" },
  { key: "low_pass_filter", label: "Low-pass filter" },
  { key: "high_pass_filter", label: "High-pass filter" },
];

const fieldLabel = css({
  display: "block",
  marginBottom: "1",
  fontSize: "sm",
  fontWeight: "medium",
});

function VibrationLogger() {
  const fileHandler = new FileHandler();

  // Devices.
  const [stage, setStage] = createSignal<Stage>("detecting");
  const [bases, setBases] = createSignal<vilo.BaseStation[]>([]);
  const [base, setBase] = createSignal<vilo.BaseStation | null>(null);
  const [baseConfig, setBaseConfig] = createSignal<vilo.RadioConfig | null>(
    null,
  );
  const [baseNotice, setBaseNotice] = createSignal("");
  const [nodeState, setNodeState] = createSignal<NodeState>("none");
  const [node, setNode] = createSignal<SelectedNode | null>(null);
  const [nodeConfig, setNodeConfig] = createSignal<vilo.RadioConfig | null>(
    null,
  );
  const [nodeNotice, setNodeNotice] = createSignal("");
  const [logConfig, setLogConfig] = createSignal<vilo.LogConfig | null>(null);
  // A device command (configure, switch) is running.
  const [busy, setBusy] = createSignal(false);

  const [baseOptions, setBaseOptions] = createSignal<vilo.RadioOptions | null>(
    null,
  );
  const [nodeOptions, setNodeOptions] = createSignal<vilo.RadioOptions | null>(
    null,
  );
  const [logOptions, setLogOptions] = createSignal<vilo.LogOptions | null>(
    null,
  );

  // Logger.
  const [session, setSession] = createSignal<Session | null>(null);
  const [starting, setStarting] = createSignal("");
  const [source, setSource] = createSignal<Source>("none");
  const [series, setSeries] = createSignal<SampleSeries>(
    createSeries(liveLabels),
  );
  const [version, setVersion] = createSignal(0);
  const [view, setView] = createSignal<RangeView>(liveView());
  const [csvName, setCsvName] = createSignal("");
  const [startedAt, setStartedAt] = createSignal(0);
  const [endedAt, setEndedAt] = createSignal(0);
  const [now, setNow] = createSignal(Date.now());

  const locked = () => session() !== null || starting() !== "";

  const clearPlot = () => {
    setSource("none");
    setSeries(createSeries(liveLabels));
    setVersion((v) => v + 1);
  };

  const clearNode = () => {
    setNode(null);
    setNodeState("none");
    setNodeConfig(null);
    setLogConfig(null);
    clearPlot();
  };

  const clearDevices = () => {
    clearNode();
    setBase(null);
    setBaseConfig(null);
  };

  // Finding the devices.

  const loadOptions = async () => {
    try {
      const [b, n, l] = await Promise.all([
        vilo.getBaseOptions(),
        vilo.getNodeOptions(),
        vilo.getLogOptions(),
      ]);
      setBaseOptions(b);
      setNodeOptions(n);
      setLogOptions(l);
    } catch (e) {
      toastError("Could not read vilo's options", e);
    }
  };

  const detect = async () => {
    setStage("detecting");
    let found: vilo.BaseStation[] = [];
    try {
      found = await vilo.listBaseStations();
    } catch (e) {
      toastError("Could not list base stations", e);
    }
    setBases(found);
    if (found.length === 0) {
      clearDevices();
      setStage("noBase");
      return;
    }
    setBaseNotice("");
    await useBase(found[0]);
  };

  const useBase = async (next: vilo.BaseStation) => {
    clearNode();
    setNodeNotice("");
    setBase(next);
    setBaseConfig(null);
    setStage("ready");
    try {
      setBaseConfig(await vilo.getBaseConfig(next.port));
    } catch (e) {
      toastError("Could not read the base station", e);
    }
    const last = await loadLastNode();
    if (last && base() === next) {
      await checkNode(last, true);
    }
  };

  // Pings the node and reads its configuration. A remembered node that does
  // not answer stays on the card as unreachable.
  const checkNode = async (
    candidate: SelectedNode,
    remembered: boolean,
  ): Promise<boolean> => {
    const port = base()!.port;
    setNode(candidate);
    setNodeState("checking");
    setNodeNotice("");
    if (!(await vilo.pingNode(port, candidate.address))) {
      if (remembered) {
        setNodeState("unreachable");
      } else {
        clearNode();
        setNodeNotice(
          `Node ${candidate.address} did not answer. Check that it is on, in range, and on the base station's frequency.`,
        );
      }
      return false;
    }
    try {
      setNodeConfig(await vilo.getNodeConfig(port, candidate.address));
      setLogConfig(await vilo.getLogConfig(port, candidate.address));
    } catch (e) {
      clearNode();
      setNodeNotice(
        `Could not read node ${candidate.address}: ${messageOf(e)}`,
      );
      return false;
    }
    setNodeState("selected");
    await saveLastNode(candidate);
    return true;
  };

  // A node from the search. The base station follows its frequency and
  // protocol first, so the two can talk.
  const useDiscovered = async (found: vilo.DiscoveredNode) => {
    const port = base()!.port;
    const current = baseConfig();
    let switched = false;
    if (
      current &&
      (current.frequency !== found.frequency ||
        current.communication_protocol !== found.comm_protocol)
    ) {
      setBusy(true);
      try {
        await vilo.setBaseConfig(port, {
          ...current,
          frequency: found.frequency,
          communication_protocol: found.comm_protocol,
        });
        setBaseConfig(await vilo.getBaseConfig(port));
        switched = true;
      } catch (e) {
        toastError("Could not switch the base station", e);
        return;
      } finally {
        setBusy(false);
      }
    }
    const selected = await checkNode(
      { address: found.address, model: found.model },
      false,
    );
    if (selected) {
      toastInfo(
        switched
          ? `Base station switched to frequency ${vilo.formatFrequency(found.frequency)}. Node ${found.address} selected.`
          : `Node ${found.address} selected.`,
      );
    }
  };

  const connectManual = async (address: number) => {
    if (await checkNode({ address, model: null }, false)) {
      toastInfo(`Node ${address} selected.`);
    }
  };

  // Configure.

  const applyBase = async (next: vilo.RadioConfig): Promise<boolean> => {
    const port = base()!.port;
    const selected = nodeState() === "selected" ? node() : null;
    const protocolChanged =
      next.communication_protocol !== baseConfig()?.communication_protocol;
    setBusy(true);
    try {
      // The node changes first, while the base station can still reach it.
      if (protocolChanged && selected && nodeConfig()) {
        await vilo.setNodeConfig(port, selected.address, {
          ...nodeConfig()!,
          communication_protocol: next.communication_protocol,
        });
      }
      await vilo.setBaseConfig(port, next);
      setBaseConfig(await vilo.getBaseConfig(port));
      if (protocolChanged && selected) {
        setNodeConfig(await vilo.getNodeConfig(port, selected.address));
      }
      toastInfo(
        protocolChanged && selected
          ? "Applied. The protocol was set on the node too."
          : "Applied.",
      );
      return true;
    } catch (e) {
      toastError("Could not apply the configuration", e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyNode = async (next: vilo.RadioConfig): Promise<boolean> => {
    const port = base()!.port;
    const address = node()!.address;
    setBusy(true);
    try {
      await vilo.setNodeConfig(port, address, next);
      setNodeConfig(await vilo.getNodeConfig(port, address));
      toastInfo("Applied to the node.");
      return true;
    } catch (e) {
      toastError("Could not apply the configuration", e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Log session.

  const poll = async (log: vilo.LogProcess) => {
    while (session()?.log === log) {
      if (!session()!.paused) {
        try {
          const sweeps = await vilo.showLog(log.endpoint);
          if (sweeps.length > 0 && session()?.log === log) {
            appendSweeps(series(), sweeps);
            setVersion((v) => v + 1);
          }
        } catch {
          // The process may be ending; its exit is handled on its own.
        }
      }
      await sleep(pollInterval);
    }
  };

  // After a failed start: is the base station still there, and does the
  // node still answer?
  const recheckDevices = async (port: string, address: number, e: unknown) => {
    setStarting("Could not start. Checking the base station…");
    let found: vilo.BaseStation[] = [];
    try {
      found = await vilo.listBaseStations();
    } catch {
      // Treated as gone.
    }
    setBases(found);
    if (!found.some((b) => b.port === port)) {
      clearDevices();
      setBaseNotice(
        "The base station stopped responding when logging started, so the base station and the node were removed.",
      );
      setStage("noBase");
      return;
    }
    setStarting(`Base station found. Pinging node ${address}…`);
    if (!(await vilo.pingNode(port, address))) {
      clearNode();
      setNodeNotice(
        `Node ${address} did not respond when logging started, so it was removed. Search for it or enter its address.`,
      );
      return;
    }
    toastError("Could not start logging", e);
  };

  const start = async () => {
    const port = base()?.port;
    const address = node()?.address;
    const config = logConfig();
    if (!port || address === undefined || !config) return;
    setStarting("Starting the session…");
    let log: vilo.LogProcess;
    try {
      await vilo.setLogConfig(port, address, config);
      log = await vilo.startLog(port, address);
    } catch (e) {
      await recheckDevices(port, address, e);
      setStarting("");
      return;
    }
    setStarting("");
    setSeries(createSeries(liveLabels));
    setVersion((v) => v + 1);
    setView(liveView());
    setStartedAt(Date.now());
    setSource("live");
    setSession({ log, paused: false });
    log.exited.then(({ stderr }) => {
      // Still the current session, so it was not ended from here.
      if (session()?.log === log) {
        setSession(null);
        setEndedAt(Date.now());
        setSource("ended");
        toaster.create({
          title: "Logging stopped",
          description: vilo.errorMessage(stderr, "vilo log start exited."),
          type: "error",
        });
      }
    });
    void poll(log);
  };

  const endSession = async () => {
    const current = session();
    if (!current) return;
    setSession(null);
    setEndedAt(Date.now());
    setSource("ended");
    await vilo.endLog(current.log);
  };

  const togglePause = async () => {
    const current = session();
    if (!current) return;
    try {
      if (current.paused) {
        await vilo.resumeLog(current.log.endpoint);
      } else {
        await vilo.pauseLog(current.log.endpoint);
      }
      if (session()?.log === current.log) {
        setSession({ ...current, paused: !current.paused });
      }
    } catch (e) {
      toastError(
        current.paused ? "Could not resume logging" : "Could not pause logging",
        e,
      );
    }
  };

  const defaultCsvName = () => {
    const d = new Date(startedAt());
    const p = (n: number) => String(n).padStart(2, "0");
    return `vibration_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.csv`;
  };

  const save = async () => {
    const current = session();
    if (!current) return;
    let path: string;
    try {
      path = await fileHandler.saveFileDialog("csv", "", defaultCsvName());
    } catch {
      return; // Cancelled.
    }
    try {
      await vilo.saveLog(current.log.endpoint, path);
      toastInfo(`Saved ${fileName(path)}`);
    } catch (e) {
      toastError("Could not save the CSV file", e);
    }
  };

  const loadCsv = async () => {
    let path: string;
    try {
      path = await fileHandler.openFileDialog("csv");
    } catch {
      return; // Cancelled.
    }
    try {
      const parsed = parseViloCsv(await readTextFile(path));
      setSeries(parsed);
      setVersion((v) => v + 1);
      setView(wholeView());
      setCsvName(fileName(path) ?? path);
      setSource("csv");
    } catch (e) {
      toastError("Could not load the CSV file", e);
    }
  };

  // Leaving the page or closing the app ends the session.
  let unlistenClose: (() => void) | undefined;
  let disposed = false;
  onMount(async () => {
    const ticker = setInterval(() => setNow(Date.now()), 500);
    onCleanup(() => clearInterval(ticker));
    void loadOptions();
    const unlisten = await getCurrentWindow().onCloseRequested(async () => {
      const current = session();
      if (current) {
        setSession(null);
        await vilo.endLog(current.log);
      }
    });
    if (disposed) {
      unlisten();
      return;
    }
    unlistenClose = unlisten;
    await detect();
  });
  onCleanup(() => {
    disposed = true;
    unlistenClose?.();
    const current = session();
    if (current) {
      setSession(null);
      void vilo.endLog(current.log);
    }
  });

  // Logger texts.

  const sampleCount = () => {
    void version();
    return series().time.length;
  };

  const runInfo = () => {
    const ended = source() === "ended";
    const end = ended ? endedAt() : now();
    return {
      label: ended ? "Duration" : "Elapsed",
      time: formatDuration((end - startedAt()) / 1000),
      samples: `${sampleCount().toLocaleString("en-US")} samples`,
    };
  };

  const csvInfo = () => {
    void version();
    const time = series().time;
    if (time.length === 0) return "";
    return `${sampleCount().toLocaleString("en-US")} samples · ${formatClock(time[0], false)} – ${formatClock(time[time.length - 1], false)}`;
  };

  return (
    <div
      class={css({
        height: "100%",
        overflow: "auto",
        paddingX: "5",
        paddingTop: "4",
        paddingBottom: "5",
        display: "flex",
        flexDirection: "column",
        gap: "4",
      })}
    >
      <TipLayer />
      <Switch>
        <Match when={stage() === "detecting"}>
          <div class={emptyBox} style={{ "min-height": "360px" }}>
            <Spinner size="lg" />
            <p class={hint}>Looking for base stations…</p>
          </div>
        </Match>

        <Match when={stage() === "noBase"}>
          <div class={emptyBox} style={{ "min-height": "360px" }}>
            <span
              class={css({
                width: "14",
                height: "14",
                borderRadius: "8px",
                background: "accent.3",
                color: "accent.11",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                "& svg": { width: "22px", height: "22px" },
              })}
            >
              <IconPlug />
            </span>
            <h1
              class={css({ marginTop: "2", fontSize: "xl", fontWeight: "600" })}
            >
              No base station found
            </h1>
            <Show when={baseNotice()}>
              <p role="alert" class={notice} style={{ "max-width": "460px" }}>
                {baseNotice()}
              </p>
            </Show>
            <p class={hint} style={{ "max-width": "420px" }}>
              Plug base station USB into this computer, then refresh.
            </p>
            <Button marginTop="2" onClick={detect}>
              <IconRefresh />
              Refresh
            </Button>
          </div>
        </Match>

        <Match when={stage() === "ready" && base()}>
          <section
            aria-label="Devices"
            style={{
              flex: "none",
              display: "flex",
              "flex-wrap": "wrap",
              "align-items": "stretch",
              gap: "10px",
            }}
          >
            <BaseStationCard
              bases={bases()}
              base={base()!}
              config={baseConfig()}
              options={baseOptions()}
              locked={locked()}
              busy={busy() || nodeState() === "checking"}
              onSelectBase={(port) => {
                const next = bases().find((b) => b.port === port);
                if (next) void useBase(next);
              }}
              onApply={applyBase}
            />
            <div
              aria-hidden="true"
              class={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "fg.subtle",
                paddingX: "0.5",
              })}
            >
              <IconArrowRight />
            </div>
            <NodeCard
              state={nodeState()}
              address={node()?.address ?? null}
              model={node()?.model ?? null}
              config={nodeConfig()}
              options={nodeOptions()}
              basePort={base()!.port}
              baseConfig={baseConfig()}
              notice={nodeNotice()}
              locked={locked()}
              busy={busy() || nodeState() === "checking"}
              onUse={(n) => void useDiscovered(n)}
              onConnect={(address) => void connectManual(address)}
              onRetry={() => {
                const current = node();
                if (current) void checkNode(current, true);
              }}
              onChangeNode={() => {
                clearNode();
                setNodeNotice("");
              }}
              onApply={applyNode}
            />
          </section>

          <Show
            when={nodeState() === "selected"}
            fallback={
              <div class={emptyBox} style={{ "min-height": "240px" }}>
                <IconChartLine class={css({ color: "fg.subtle" })} />
                <p class={hint}>
                  The logger appears here once a node is reachable.
                </p>
              </div>
            }
          >
            <section
              aria-labelledby="vilo-logger-title"
              class={css({
                flex: "1",
                minHeight: "440px",
                display: "flex",
                flexDirection: "column",
                gap: "3",
                borderWidth: "1px",
                borderColor: "border",
                borderRadius: "10px",
                background: "gray.1",
                paddingX: "4",
                paddingY: "3.5",
              })}
            >
              <h2
                id="vilo-logger-title"
                class={css({ fontSize: "lg", fontWeight: "semibold" })}
              >
                Logger
              </h2>
              <div
                style={{
                  flex: "1",
                  "min-height": "0",
                  display: "flex",
                  "flex-wrap": "wrap",
                  gap: "16px",
                  "align-items": "stretch",
                }}
              >
                <div
                  style={{
                    flex: "0 1 240px",
                    "min-width": "220px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "12px",
                  }}
                >
                  <h3 class={css({ fontSize: "md", fontWeight: "semibold" })}>
                    Log settings
                  </h3>
                  {logFields.map((field) => (
                    <div>
                      <label class={fieldLabel} for={`vilo-log-${field.key}`}>
                        {field.label}
                      </label>
                      <Tip text={sessionLockText} when={locked()} block>
                        <OptionSelect
                          id={`vilo-log-${field.key}`}
                          value={logConfig()?.[field.key] ?? ""}
                          options={logOptions()?.[field.key] ?? []}
                          disabled={locked() || !logConfig()}
                          onChange={(value) =>
                            setLogConfig({
                              ...logConfig()!,
                              [field.key]: value,
                            })
                          }
                        />
                      </Tip>
                    </div>
                  ))}
                  <p class={hint}>
                    Written to the node when the session starts.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Show
                      when={session()}
                      fallback={
                        <Button
                          loading={starting() !== ""}
                          loadingText="Starting…"
                          disabled={busy() || !logConfig()}
                          onClick={start}
                        >
                          <IconPlayerPlayFilled />
                          Start logging
                        </Button>
                      }
                    >
                      <Tip
                        text="Unsaved data will be lost. Save CSV first to keep it."
                        id="vilo-end-session-tip"
                      >
                        <Button
                          colorPalette="red"
                          aria-describedby="vilo-end-session-tip"
                          onClick={endSession}
                        >
                          <IconPlayerStopFilled />
                          End session
                        </Button>
                      </Tip>
                    </Show>
                  </div>
                  <Show when={starting()}>
                    <p class={hint} role="status">
                      {starting()}
                    </p>
                  </Show>
                </div>

                <div
                  style={{
                    flex: "999 1 520px",
                    "min-width": "0",
                    "min-height": "340px",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                  }}
                >
                  <div
                    class={css({
                      flex: "none",
                      minHeight: "34px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      columnGap: "4",
                      rowGap: "2.5",
                      flexWrap: "wrap",
                      fontSize: "sm",
                    })}
                  >
                    <Switch fallback={<span />}>
                      <Match when={source() === "live" || source() === "ended"}>
                        <div
                          class={`${numeric} ${css({ display: "flex", gap: "3" })}`}
                        >
                          <span>
                            <span class={css({ color: "fg.muted" })}>
                              {runInfo().label}
                            </span>{" "}
                            {runInfo().time}
                          </span>
                          <span class={css({ color: "fg.muted" })}>
                            {runInfo().samples}
                          </span>
                        </div>
                      </Match>
                      <Match when={source() === "csv"}>
                        <div
                          class={css({
                            display: "flex",
                            alignItems: "center",
                            gap: "2.5",
                            flexWrap: "wrap",
                          })}
                        >
                          <IconFile size={16} />
                          <span class={css({ fontWeight: "semibold" })}>
                            {csvName()}
                          </span>
                          <span
                            class={`${numeric} ${css({ color: "fg.muted" })}`}
                          >
                            {csvInfo()}
                          </span>
                        </div>
                      </Match>
                    </Switch>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        "flex-wrap": "wrap",
                      }}
                    >
                      <Show when={session()}>
                        <Show
                          when={session()!.paused}
                          fallback={
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={togglePause}
                            >
                              <IconPlayerPauseFilled />
                              Pause
                            </Button>
                          }
                        >
                          <Button size="sm" onClick={togglePause}>
                            <IconPlayerPlayFilled />
                            Resume
                          </Button>
                        </Show>
                        <Button size="sm" variant="outline" onClick={save}>
                          <IconDownload />
                          Save CSV…
                        </Button>
                      </Show>
                      <Show
                        when={
                          !session() &&
                          (source() === "ended" || source() === "csv")
                        }
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={starting() !== ""}
                          onClick={loadCsv}
                        >
                          <IconFile />
                          Load CSV…
                        </Button>
                      </Show>
                      <Show when={source() === "csv"}>
                        <Button size="sm" variant="outline" onClick={clearPlot}>
                          <IconX />
                          Close file
                        </Button>
                      </Show>
                    </div>
                  </div>

                  <VibrationPlot
                    series={series()}
                    version={version()}
                    view={view()}
                    onViewChange={setView}
                    live={source() === "live" && !session()?.paused}
                    empty={source() === "none"}
                  >
                    <IconChartLine
                      size={22}
                      class={css({ color: "fg.subtle" })}
                    />
                    <p class={css({ fontSize: "md", fontWeight: "semibold" })}>
                      Start logging to see the live plot
                    </p>
                    <p class={hint}>or</p>
                    <Button
                      variant="outline"
                      marginTop="1.5"
                      disabled={starting() !== ""}
                      onClick={loadCsv}
                    >
                      <IconFile />
                      Load CSV…
                    </Button>
                  </VibrationPlot>
                </div>
              </div>
            </section>
          </Show>
        </Match>
      </Switch>
    </div>
  );
}

export default VibrationLogger;
