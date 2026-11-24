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
  IconInfoCircle,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconPlug,
  IconRefresh,
} from "@tabler/icons-solidjs";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { toaster } from "~/components/ui/toast";
import { FileHandler } from "~/services/FileHandler";
import * as vilo from "~/services/ViloService";
import {
  calculateCapacity,
  formatClock,
  formatDuration,
  liveView,
  parseCsv,
  RangeView,
  SampleSeries,
  wholeView,
} from "~/utils/VibrationData";
import {
  BaseStationCard,
  sessionLockText,
} from "../features/VibrationLogger/BaseStationCard";
import { Tip, TipLayer } from "../features/VibrationLogger/CursorTip";
import { NodeCard, NodeState } from "../features/VibrationLogger/NodeCard";
import { OptionSelect } from "../features/VibrationLogger/OptionSelect";
import { VibrationPlot } from "../features/VibrationLogger/VibrationPlot";
import {
  emptyBox,
  hint,
  infoButton,
  notice,
  numeric,
} from "../features/VibrationLogger/styles";

type Stage = "detecting" | "noBase" | "ready";
// What the plot shows: nothing, the running session, the session that just
// ended, or a loaded CSV file.
type Source = "none" | "live" | "ended" | "csv";
type Session = { log: vilo.LogProcess; paused: boolean };
type SelectedNode = { address: number; model: string | null };

const liveLabels = ["ch1", "ch2", "ch3"];
const pollInterval = 5;
// Samples per write when saving, so a long session never needs one huge
// string.
const csvChunk = 20000;
// How much of a session the page keeps, in minutes. The page allocates
// room for it when the session starts and then drops the oldest samples.
const storeLimits = ["1", "5", "10", "30", "60"];
const defaultStoreLimit = "10";
const storeLimitInfo =
  "How much of the newest data the logger keeps. Older data is dropped, so Save CSV saves at most this much.";

const formatMinutes = (value: string) => {
  const minutes = Number(value);
  return minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fileName = (path: string) => path.replaceAll("\\", "/").split("/").pop();

function toastError(title: string, e: unknown) {
  toaster.create({ title, description: messageOf(e), type: "error" });
}

function toastInfo(title: string) {
  toaster.create({ title, type: "success" });
}

async function writeCsv(path: string, data: SampleSeries) {
  const count = data.time.length;
  await writeTextFile(path, data.formatCsvHeader());
  for (let from = 0; from < count; from += csvChunk) {
    const to = Math.min(from + csvChunk, count);
    await writeTextFile(path, data.formatCsvRows(from, to), { append: true });
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
  const [storeLimit, setStoreLimit] = createSignal(defaultStoreLimit);
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
    new SampleSeries(liveLabels, 0),
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
    setSeries(new SampleSeries(liveLabels, 0));
    setVersion((v) => v + 1);
  };

  const clearNode = () => {
    setNode(null);
    setNodeState("none");
    setNodeConfig(null);
    setLogConfig(null);
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
  };

  // Pings the node and reads its configuration.
  // `keep`: a node that does not answer stays, as unreachable, so that it
  // can be set to idle; otherwise it is removed.
  const checkNode = async (
    candidate: SelectedNode,
    keep: boolean,
  ): Promise<boolean> => {
    const port = base()!.port;
    setNode(candidate);
    setNodeState("checking");
    setNodeNotice("");
    if (!(await vilo.pingNode(port, candidate.address))) {
      if (keep) {
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
      // A node entered by address: its model comes from its state.
      if (candidate.model === null) {
        const { model } = await vilo.getNodeState(port, candidate.address);
        if (typeof model !== "string") {
          throw new Error(`Unknown model ${model}.`);
        }
        setNode({ ...candidate, model });
      }
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

  // Kept when it does not answer: an entered node is often asleep.
  const connectManual = async (address: number) => {
    if (await checkNode({ address, model: null }, true)) {
      toastInfo(`Node ${address} selected.`);
    }
  };

  const setToIdle = async () => {
    const current = node();
    if (!current) return;
    setNodeState("settingIdle");
    try {
      await vilo.setNodeToIdle(base()!.port, current.address);
    } catch (e) {
      setNodeState("unreachable");
      toastError(
        `Node ${current.address} was not set to idle`,
        messageOf(e) === "Timeout"
          ? "It did not answer in time. Check that it is on, in range, and on the base station's frequency."
          : e,
      );
      return;
    }
    await checkNode(current, true);
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
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const appendFetched = async (log: vilo.LogProcess, target: SampleSeries) => {
    const sweeps = await vilo.showLog(log.endpoint);
    // Unless a new session or a CSV file replaced the data meanwhile.
    if (sweeps.tick.length > 0 && series() === target) {
      target.appendSweeps(sweeps);
      setVersion((v) => v + 1);
    }
  };

  const fetchSamples = (log: vilo.LogProcess, target: SampleSeries) =>
    enqueue(() => appendFetched(log, target));

  // Also while paused, for the samples sent just before the pause.
  const poll = async (log: vilo.LogProcess, target: SampleSeries) => {
    while (session()?.log === log) {
      const started = performance.now();
      try {
        await fetchSamples(log, target);
      } catch {
        // The process may be ending; its exit is handled on its own.
      }
      await sleep(Math.max(0, pollInterval - (performance.now() - started)));
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
    // Kept, as unreachable, so that it can be set to idle.
    if (!(await vilo.pingNode(port, address))) {
      setNodeState("unreachable");
      toastError("Could not start logging", `Node ${address} did not respond.`);
      return;
    }
    toastError("Could not start logging", e);
  };

  const start = async () => {
    const port = base()?.port;
    const address = node()?.address;
    const config = logConfig();
    if (!port || address === undefined || !config) return;
    clearPlot();
    // Room for the whole store limit, before the node starts.
    let target: SampleSeries;
    try {
      target = new SampleSeries(
        liveLabels,
        calculateCapacity(config.sample_rate, Number(storeLimit())),
      );
    } catch (e) {
      toastError("Could not start logging", e);
      return;
    }
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
    setSeries(target);
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
    void poll(log, target);
  };

  const endSession = async () => {
    const current = session();
    if (!current) return;
    const target = series();
    setSession(null);
    setEndedAt(Date.now());
    setSource("ended");
    await vilo.endLog(current.log, () => fetchSamples(current.log, target));
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
    const target = series();
    let path: string;
    try {
      path = await fileHandler.saveFileDialog("csv", "", defaultCsvName());
    } catch {
      return; // Cancelled.
    }
    try {
      await enqueue(async () => {
        // With the samples that arrived since the last poll.
        if (current && session()?.log === current.log) {
          await appendFetched(current.log, target).catch(() => undefined);
        }
        await writeCsv(path, target);
      });
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
      const parsed = parseCsv(await readTextFile(path));
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
    return `${sampleCount().toLocaleString("en-US")} samples · ${formatClock(time.get(0), false)} – ${formatClock(time.get(time.length - 1), false)}`;
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
              busy={
                busy() ||
                nodeState() === "checking" ||
                nodeState() === "settingIdle"
              }
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
              busy={
                busy() ||
                nodeState() === "checking" ||
                nodeState() === "settingIdle"
              }
              onUse={(n) => void useDiscovered(n)}
              onConnect={(address) => void connectManual(address)}
              onSetIdle={() => void setToIdle()}
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
                  <div>
                    <div
                      class={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5",
                        marginBottom: "1",
                      })}
                    >
                      <label
                        class={css({ fontSize: "sm", fontWeight: "medium" })}
                        for="vilo-store-limit"
                      >
                        Store limit
                      </label>
                      <Tip text={storeLimitInfo} id="vilo-store-limit-tip">
                        <button
                          type="button"
                          class={infoButton}
                          aria-label="About the store limit"
                          aria-describedby="vilo-store-limit-tip"
                        >
                          <IconInfoCircle />
                        </button>
                      </Tip>
                    </div>
                    <Tip text={sessionLockText} when={locked()} block>
                      <OptionSelect
                        id="vilo-store-limit"
                        value={storeLimit()}
                        options={storeLimits}
                        format={formatMinutes}
                        disabled={locked()}
                        onChange={setStoreLimit}
                      />
                    </Tip>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Show
                      when={session()}
                      fallback={
                        <Tip
                          text="Unsaved data from previous session will be lost."
                          id="vilo-start-tip"
                          when={source() === "ended"}
                        >
                          <Button
                            loading={starting() !== ""}
                            loadingText="Starting…"
                            disabled={busy() || !logConfig()}
                            aria-describedby={
                              source() === "ended"
                                ? "vilo-start-tip"
                                : undefined
                            }
                            onClick={start}
                          >
                            <IconPlayerPlayFilled />
                            Start logging
                          </Button>
                        </Tip>
                      }
                    >
                      <Button colorPalette="red" onClick={endSession}>
                        <IconPlayerStopFilled />
                        End session
                      </Button>
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
                      {/* Last, where it is during a session too. */}
                      <Show when={source() === "live" || source() === "ended"}>
                        <Button size="sm" variant="outline" onClick={save}>
                          <IconDownload />
                          Save CSV…
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
