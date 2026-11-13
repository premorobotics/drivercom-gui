import { createSignal, For, Match, onCleanup, Show, Switch } from "solid-js";
import {
  IconBroadcast,
  IconBroadcastOff,
  IconSearch,
  IconSettings,
  IconX,
} from "@tabler/icons-solidjs";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  DiscoveredNode,
  discoverNodes,
  formatFrequency,
  formatNodeModel,
  formatOption,
  RadioConfig,
  RadioOptions,
} from "~/services/ViloService";
import {
  frequencyInfo,
  protocolInfo,
  sessionLockText,
} from "./BaseStationCard";
import { Tip } from "./CursorTip";
import { FactLabel } from "./FactLabel";
import { OptionSelect } from "./OptionSelect";
import {
  actions,
  card,
  cardHead,
  deviceIcon,
  deviceIconMuted,
  deviceName,
  eyebrow,
  factField,
  factKey,
  facts,
  factValue,
  hint,
  notice,
  numeric,
} from "./styles";

export type NodeState = "none" | "checking" | "unreachable" | "selected";

type NodeCardProps = {
  state: NodeState;
  address: number | null;
  model: string | null;
  config: RadioConfig | null;
  options: RadioOptions | null;
  basePort: string;
  baseConfig: RadioConfig | null;
  notice: string;
  // A log session exists.
  locked: boolean;
  // Another device command is running.
  busy: boolean;
  onUse: (node: DiscoveredNode) => void;
  onConnect: (address: number) => void;
  onRetry: () => void;
  onChangeNode: () => void;
  // Resolves true when applied.
  onApply: (config: RadioConfig) => Promise<boolean>;
};

const powerInfo = "Powers your region does not allow are rejected by the node.";

// How long one search listens for nodes announcing themselves.
const searchDuration = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const pulse = css({
  width: "2",
  height: "2",
  borderRadius: "full",
  background: "accent.9",
  display: "inline-block",
  animation: "pulse 1.2s ease-in-out infinite",
  _motionReduce: { animation: "none" },
});

const pill = css({
  display: "inline-flex",
  alignItems: "center",
  height: "6",
  paddingX: "2.5",
  borderRadius: "full",
  fontSize: "xs",
  fontWeight: "semibold",
  background: "red.3",
  color: "red.11",
});

export function NodeCard(props: NodeCardProps) {
  const name = () =>
    props.model ? formatNodeModel(props.model) : `Node ${props.address}`;

  // Configure mode.
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal<RadioConfig | null>(null);
  const [applying, setApplying] = createSignal(false);

  const apply = async () => {
    const next = draft();
    if (!next) return;
    setApplying(true);
    const applied = await props.onApply(next);
    setApplying(false);
    if (applied) {
      setEditing(false);
    }
  };

  // Node search.
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [listening, setListening] = createSignal(false);
  const [found, setFound] = createSignal<DiscoveredNode[]>([]);
  const [searchError, setSearchError] = createSignal("");
  let searchRun = 0;

  const search = async () => {
    const run = ++searchRun;
    setFound([]);
    setSearchError("");
    setSearchOpen(true);
    setListening(true);
    const until = Date.now() + searchDuration;
    while (run === searchRun && Date.now() < until) {
      try {
        const nodes = await discoverNodes(props.basePort);
        if (run !== searchRun) break;
        setFound((prev) => [
          ...prev,
          ...nodes.filter((n) => !prev.some((p) => p.address === n.address)),
        ]);
      } catch (e) {
        if (run === searchRun) {
          setSearchError((e as Error).message);
        }
        break;
      }
      await sleep(300);
    }
    if (run === searchRun) {
      setListening(false);
    }
  };

  const stopSearch = () => {
    searchRun++;
    setListening(false);
  };

  const closeSearch = () => {
    stopSearch();
    setSearchOpen(false);
  };

  onCleanup(stopSearch);

  const searchStatus = () => {
    if (listening()) return "Listening for nodes…";
    if (searchError()) return "Search stopped";
    const count = found().length;
    return `${count} ${count === 1 ? "node" : "nodes"} found`;
  };

  const foundDetail = (n: DiscoveredNode) => {
    const base = props.baseConfig;
    let text = `Frequency ${formatFrequency(n.frequency)} · ${formatOption(n.comm_protocol)}`;
    if (!base) return text;
    const changes: string[] = [];
    if (base.frequency !== n.frequency) {
      changes.push(`frequency ${formatFrequency(base.frequency)}`);
    }
    if (base.communication_protocol !== n.comm_protocol) {
      changes.push(formatOption(base.communication_protocol));
    }
    text +=
      changes.length === 0
        ? " · same as the base station"
        : ` · the base station switches from ${changes.join(", ")}`;
    return text;
  };

  // Manual address.
  const [manual, setManual] = createSignal("");
  const manualAddress = () => {
    const text = manual().trim();
    if (!/^\d+$/.test(text)) return null;
    const value = Number(text);
    return value > 0 && value <= 0xffffffff ? value : null;
  };
  const connect = () => {
    const address = manualAddress();
    if (address !== null) {
      closeSearch();
      props.onConnect(address);
    }
  };

  return (
    <article class={card}>
      <Switch>
        <Match when={props.state === "selected"}>
          <div class={cardHead}>
            <span class={deviceIcon}>
              <IconBroadcast />
            </span>
            <div style={{ "min-width": "0" }}>
              <p class={eyebrow}>Node</p>
              <h2 class={deviceName}>{name()}</h2>
            </div>
            <div class={actions} style={{ "min-width": "240px" }}>
              <Show
                when={editing()}
                fallback={
                  <>
                    <Tip text={sessionLockText} when={props.locked}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={props.locked || props.busy || !props.config}
                        onClick={() => {
                          setDraft(props.config ? { ...props.config } : null);
                          setEditing(true);
                        }}
                      >
                        <IconSettings />
                        Configure
                      </Button>
                    </Tip>
                    <Tip text={sessionLockText} when={props.locked}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={props.locked || props.busy}
                        onClick={() => props.onChangeNode()}
                      >
                        Change node
                      </Button>
                    </Tip>
                  </>
                }
              >
                <Button
                  size="sm"
                  variant="outline"
                  disabled={applying()}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" loading={applying()} onClick={apply}>
                  Apply
                </Button>
              </Show>
            </div>
          </div>
          <div class={facts}>
            <div>
              <FactLabel label="Address" />
              <span class={factValue}>{props.address}</span>
            </div>
            <div>
              <FactLabel label="Frequency" info={frequencyInfo} />
              <span class={factValue}>
                {props.config ? formatFrequency(props.config.frequency) : "—"}
              </span>
            </div>
            <div>
              <FactLabel label="Protocol" info={protocolInfo} />
              <span class={factValue}>
                {props.config
                  ? formatOption(props.config.communication_protocol)
                  : "—"}
              </span>
            </div>
            <div>
              <Show
                when={editing() && draft()}
                fallback={
                  <>
                    <FactLabel label="Transmit power" info={powerInfo} />
                    <span class={factValue}>
                      {props.config
                        ? formatOption(props.config.transmit_power)
                        : "—"}
                    </span>
                  </>
                }
              >
                <FactLabel
                  label="Transmit power"
                  for="vilo-node-power"
                  info={powerInfo}
                />
                <div class={factField}>
                  <OptionSelect
                    id="vilo-node-power"
                    value={draft()!.transmit_power}
                    options={props.options?.transmit_power ?? []}
                    onChange={(value) =>
                      setDraft({ ...draft()!, transmit_power: value })
                    }
                  />
                </div>
              </Show>
            </div>
          </div>
        </Match>

        <Match when={props.state === "checking"}>
          <div class={cardHead}>
            <span class={deviceIcon}>
              <IconBroadcast />
            </span>
            <div style={{ "min-width": "0" }}>
              <p class={eyebrow}>Node</p>
              <h2 class={deviceName}>{name()}</h2>
            </div>
            <div class={actions}>
              <p role="status" class={hint} style={{ display: "flex" }}>
                <Spinner size="sm" marginRight="2" />
                Checking node {props.address}…
              </p>
            </div>
          </div>
        </Match>

        <Match when={props.state === "unreachable"}>
          <div class={cardHead}>
            <span class={deviceIconMuted}>
              <IconBroadcastOff />
            </span>
            <div style={{ "min-width": "0" }}>
              <p class={eyebrow}>Node</p>
              <h2 class={deviceName}>{name()}</h2>
            </div>
            <span class={pill}>Unreachable</span>
            <div class={actions}>
              <Button
                size="sm"
                variant="outline"
                disabled={props.busy}
                onClick={() => props.onRetry()}
              >
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={props.busy}
                onClick={() => props.onChangeNode()}
              >
                Change node
              </Button>
            </div>
          </div>
          <p class={hint}>
            Node {props.address} did not answer the ping. It may be asleep,
            switched off, out of range, or on another frequency than the base
            station.
          </p>
        </Match>

        <Match when={props.state === "none"}>
          <div class={cardHead}>
            <span class={deviceIconMuted}>
              <IconBroadcast />
            </span>
            <div style={{ "min-width": "0" }}>
              <p class={eyebrow}>Node</p>
              <h2 class={deviceName}>No node selected</h2>
            </div>
            <div class={actions}>
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Button
                  size="sm"
                  disabled={props.busy}
                  aria-expanded={searchOpen()}
                  aria-controls="vilo-node-search"
                  onClick={() => (searchOpen() ? closeSearch() : search())}
                >
                  <IconSearch />
                  Search for nodes
                </Button>
                <Show when={searchOpen()}>
                  <button
                    type="button"
                    aria-label="Close search results"
                    tabIndex={-1}
                    onClick={closeSearch}
                    class={css({
                      position: "fixed",
                      inset: "0",
                      background: "transparent",
                      cursor: "default",
                      zIndex: "dropdown",
                    })}
                  />
                  <div
                    id="vilo-node-search"
                    role="dialog"
                    aria-label="Search for nodes"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") closeSearch();
                    }}
                    class={css({
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: "0",
                      width: "380px",
                      maxWidth: "calc(100vw - 32px)",
                      background: "gray.1",
                      borderWidth: "1px",
                      borderColor: "border",
                      borderRadius: "10px",
                      boxShadow: "lg",
                      zIndex: "popover",
                      display: "flex",
                      flexDirection: "column",
                      textAlign: "left",
                    })}
                  >
                    <div
                      class={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "2",
                        paddingY: "2",
                        paddingLeft: "3",
                        paddingRight: "2",
                        borderBottomWidth: "1px",
                        borderColor: "border",
                      })}
                    >
                      <p
                        role="status"
                        class={css({
                          fontSize: "sm",
                          fontWeight: "semibold",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2",
                        })}
                      >
                        <Show when={listening()}>
                          <span class={pulse} aria-hidden="true" />
                        </Show>
                        {searchStatus()}
                      </p>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <Show
                          when={listening()}
                          fallback={
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={search}
                            >
                              Search again
                            </Button>
                          }
                        >
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={stopSearch}
                          >
                            Stop
                          </Button>
                        </Show>
                        <IconButton
                          size="xs"
                          variant="plain"
                          aria-label="Close"
                          onClick={closeSearch}
                        >
                          <IconX />
                        </IconButton>
                      </div>
                    </div>
                    <p class={hint} style={{ padding: "8px 12px 4px" }}>
                      Power-cycle the node so it announces itself. Nodes on
                      every frequency are found.
                    </p>
                    <Show when={searchError()}>
                      <p class={notice} style={{ margin: "4px 12px" }}>
                        {searchError()}
                      </p>
                    </Show>
                    <div
                      style={{
                        "max-height": "260px",
                        "overflow-y": "auto",
                        padding: "0 6px 6px",
                      }}
                    >
                      <For
                        each={found()}
                        fallback={
                          <p class={hint} style={{ padding: "8px 6px" }}>
                            No nodes found yet.
                          </p>
                        }
                      >
                        {(n) => (
                          <div
                            class={css({
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "3",
                              paddingX: "1.5",
                              paddingY: "2",
                              borderTopWidth: "1px",
                              borderColor: "gray.3",
                            })}
                          >
                            <div style={{ "min-width": "0" }}>
                              <p
                                class={`${numeric} ${css({ fontSize: "sm", fontWeight: "semibold" })}`}
                              >
                                {n.address} · {formatNodeModel(n.model)}
                              </p>
                              <p class={hint}>{foundDetail(n)}</p>
                            </div>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                closeSearch();
                                props.onUse(n);
                              }}
                            >
                              Use
                            </Button>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </span>
            </div>
          </div>
          <Show when={props.notice}>
            <p role="alert" class={notice}>
              {props.notice}
            </p>
          </Show>
          <div
            style={{
              display: "flex",
              gap: "8px",
              "align-items": "flex-end",
              "flex-wrap": "wrap",
            }}
          >
            <div style={{ flex: "1 1 160px", "min-width": "140px" }}>
              <label class={factKey} for="vilo-node-address">
                Or enter the node address
              </label>
              <Input
                id="vilo-node-address"
                size="sm"
                marginTop="0.5"
                inputMode="numeric"
                placeholder="e.g. 57143"
                value={manual()}
                onInput={(e) => setManual(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") connect();
                }}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={props.busy || manualAddress() === null}
              onClick={connect}
            >
              Connect
            </Button>
          </div>
        </Match>
      </Switch>
    </article>
  );
}
