import { createUniqueId, Show } from "solid-js";
import { IconInfoCircle } from "@tabler/icons-solidjs";
import { Tip } from "./CursorTip";
import { factKey, infoButton } from "./styles";

type FactLabelProps = {
  label: string;
  // Id of the field it labels, if the value is editable.
  for?: string;
  // Explanation shown by the info icon.
  info?: string;
};

// The small label above a device value, with an optional info icon.
export function FactLabel(props: FactLabelProps) {
  const tipId = createUniqueId();

  return (
    <div class={factKey}>
      <Show when={props.for} fallback={<span>{props.label}</span>}>
        <label for={props.for}>{props.label}</label>
      </Show>
      <Show when={props.info}>
        <Tip text={props.info!} id={tipId}>
          <button
            type="button"
            class={infoButton}
            aria-label={`About the ${props.label.toLowerCase()}`}
            aria-describedby={tipId}
          >
            <IconInfoCircle />
          </button>
        </Tip>
      </Show>
    </div>
  );
}
