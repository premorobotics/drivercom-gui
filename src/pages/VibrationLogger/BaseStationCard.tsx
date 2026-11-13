import { createSignal, Show } from "solid-js";
import { IconPlug, IconSettings } from "@tabler/icons-solidjs";
import { Button } from "~/components/ui/button";
import {
  BaseStation,
  formatBaseStation,
  formatFrequency,
  formatOption,
  RadioConfig,
  RadioOptions,
} from "~/services/ViloService";
import { Tip } from "./CursorTip";
import { FactLabel } from "./FactLabel";
import { OptionSelect } from "./OptionSelect";
import {
  actions,
  card,
  cardHead,
  deviceIcon,
  deviceName,
  eyebrow,
  factField,
  facts,
  factValue,
} from "./styles";

export const sessionLockText = "Disabled during a log session";
export const frequencyInfo =
  "Base station and node share frequency configuration";
export const protocolInfo =
  "Base station and node share protocol configuration";

type BaseStationCardProps = {
  bases: BaseStation[];
  base: BaseStation;
  config: RadioConfig | null;
  options: RadioOptions | null;
  // A log session exists.
  locked: boolean;
  // Another device command is running.
  busy: boolean;
  onSelectBase: (port: string) => void;
  // Resolves true when applied.
  onApply: (config: RadioConfig) => Promise<boolean>;
};

export function BaseStationCard(props: BaseStationCardProps) {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal<RadioConfig | null>(null);
  const [applying, setApplying] = createSignal(false);

  const startEditing = () => {
    setDraft(props.config ? { ...props.config } : null);
    setEditing(true);
  };

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

  return (
    <article class={card}>
      <div class={cardHead}>
        <span class={deviceIcon}>
          <IconPlug />
        </span>
        <div style={{ "min-width": "0" }}>
          <p class={eyebrow}>Base station</p>
          <h2 class={deviceName}>{formatBaseStation(props.base)}</h2>
        </div>
        <div class={actions} style={{ "min-width": "190px" }}>
          <Show
            when={editing()}
            fallback={
              <Tip text={sessionLockText} when={props.locked}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={props.locked || props.busy || !props.config}
                  onClick={startEditing}
                >
                  <IconSettings />
                  Configure
                </Button>
              </Tip>
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
          <Show
            when={props.bases.length > 1}
            fallback={
              <>
                <FactLabel label="Port" />
                <span class={factValue}>{props.base.port}</span>
              </>
            }
          >
            <FactLabel label="Port" for="vilo-base-port" />
            <Tip text={sessionLockText} when={props.locked} block>
              <div class={factField}>
                <OptionSelect
                  id="vilo-base-port"
                  value={props.base.port}
                  options={props.bases.map((b) => b.port)}
                  disabled={props.locked || props.busy || editing()}
                  onChange={(port) => props.onSelectBase(port)}
                />
              </div>
            </Tip>
          </Show>
        </div>
        <div>
          <FactLabel label="Frequency" info={frequencyInfo} />
          <span class={factValue}>
            {props.config ? formatFrequency(props.config.frequency) : "—"}
          </span>
        </div>
        <div>
          <Show
            when={editing() && draft()}
            fallback={
              <>
                <FactLabel label="Protocol" info={protocolInfo} />
                <span class={factValue}>
                  {props.config
                    ? formatOption(props.config.communication_protocol)
                    : "—"}
                </span>
              </>
            }
          >
            <FactLabel
              label="Protocol"
              for="vilo-base-protocol"
              info={protocolInfo}
            />
            <div class={factField}>
              <OptionSelect
                id="vilo-base-protocol"
                value={draft()!.communication_protocol}
                options={props.options?.communication_protocol ?? []}
                onChange={(value) =>
                  setDraft({ ...draft()!, communication_protocol: value })
                }
              />
            </div>
          </Show>
        </div>
        <div>
          <Show
            when={editing() && draft()}
            fallback={
              <>
                <FactLabel
                  label="Transmit power"
                  info="Powers your region does not allow are rejected by the base station."
                />
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
              for="vilo-base-power"
              info="Powers your region does not allow are rejected by the base station."
            />
            <div class={factField}>
              <OptionSelect
                id="vilo-base-power"
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
    </article>
  );
}
