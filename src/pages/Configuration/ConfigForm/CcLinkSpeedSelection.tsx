import { For, Show } from "solid-js";
import * as Select from "../../../components/ui/select";
import { createListCollection } from "@ark-ui/solid";
import { Text } from "~/components/ui/text";
import { cclinkSpeed } from "~/store/GlobalState";
import { css } from "styled-system/css";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/icon-button";
import { IconHelp } from "@tabler/icons-solidjs";

type CcLinkSpeedSelectionProps = {
  id: string;
  value: string;
  onValueChange?: (value: string) => void;
  originalFile?: string;
  description?: object;
  isFocused?: boolean;
};

export function CcLinkSpeedSelection(props: CcLinkSpeedSelectionProps) {
  const collection = createListCollection({
    items: cclinkSpeed().map((cclink) => {
      return { label: cclink, value: cclink };
    }),
  });

  return (
    <div
      style={{
        display: "grid",
        "grid-template-columns": `minmax(0,1fr) 40%`,
        "align-items": "center",
      }}
    >
      <Text
        display="flex"
        alignItems="center"
        gap="0"
        fontSize="sm"
        fontFamily="body"
      >
        <Show when={props.originalFile !== props.value}>
          <div
            class={css({
              background: "accent.9",
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "1rem",
              marginTop: "0.3rem",
            })}
          />
        </Show>
        <div
          class={css({
            background: props.isFocused ? "accent.7" : "transparent",
          })}
        >
          {"cc link speed"}
        </div>
        <Show when={props.description && "description" in props.description}>
          <Tooltip
            content={
              props.description![
                "description" as keyof typeof props.description
              ]
            }
          >
            <IconButton
              size={"2xs"}
              padding="0"
              variant={"plain"}
              onClick={(e) => {
                e.stopPropagation();
              }}
              opacity={"0.5"}
            >
              <IconHelp />
            </IconButton>
          </Tooltip>
        </Show>
      </Text>
      <Select.Root
        size="sm"
        collection={collection}
        value={[props.value]}
        onValueChange={(e) => {
          if (e.value[0] !== props.value) {
            props.onValueChange?.(e.value[0]);
          }
        }}
      >
        <Select.Control>
          <Select.Trigger
            borderColor={"gray.7"}
            padding={"0"}
            height={"1.5rem"}
          >
            <Select.ValueText
              id={props.id}
              width="100%"
              placeholder="Select a framework"
              textAlign={"end"}
            />
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            <For each={collection.items}>
              {(item) => (
                <Select.Item item={item.value}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              )}
            </For>
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    </div>
  );
}
