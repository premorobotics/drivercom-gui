import { createListCollection } from "@ark-ui/solid";
import { createMemo, For } from "solid-js";
import { Portal } from "solid-js/web";
import * as Select from "~/components/ui/select";
import { formatOption } from "~/services/ViloService";

type OptionSelectProps = {
  // Id of the trigger, for a <label for>.
  id: string;
  value: string;
  // Values as vilo names them; the labels come from formatOption.
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function OptionSelect(props: OptionSelectProps) {
  const collection = createMemo(() =>
    createListCollection({
      items: props.options.map((value) => ({
        label: formatOption(value),
        value,
      })),
    }),
  );

  return (
    <Select.Root
      size="sm"
      width="100%"
      ids={{ trigger: props.id }}
      collection={collection()}
      value={[props.value]}
      disabled={props.disabled}
      positioning={{ sameWidth: true }}
      onValueChange={(e) => {
        const value = e.value[0];
        if (value && value !== props.value) {
          props.onChange(value);
        }
      }}
    >
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="—" />
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            <For each={collection().items}>
              {(item) => (
                <Select.Item item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              )}
            </For>
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}
