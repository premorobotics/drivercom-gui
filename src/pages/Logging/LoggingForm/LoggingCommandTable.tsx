import { createSignal, For, Show } from "solid-js";
import { createListCollection } from "@ark-ui/solid";
import * as Select from "../../../components/ui/select";
import { createStore, reconcile } from "solid-js/store";
import {
  CommandType,
  Current_state_Schema,
  Position_profile_Schema,
  Speed_profile_Schema,
} from "src-tauri/generated/config/LogConfigType.tsx";
import { Text } from "~/components/ui/text";
import { Form, FormProps } from "~/components/Form";

type LoggingCommandProps = Omit<FormProps, "value"> & {
  config: CommandType;
  defaultValue: string;
};

export function LoggingCommandTable(props: LoggingCommandProps) {
  const [command, setCommand] = createStore(props.config);

  const speedProfileDefaultValue: CommandType = {
    speed_profile: Speed_profile_Schema.parse({}),
  };
  const positionProfileDefaultValue: CommandType = {
    position_profile: Position_profile_Schema.parse({}),
  };
  const currentState: CommandType = {
    current_state: Current_state_Schema.parse({}),
  };

  const commandList: { id: string; defaultValue: CommandType }[] = [
    { id: "current_state", defaultValue: currentState },
    { id: "speed_profile", defaultValue: speedProfileDefaultValue },
    { id: "position_profile", defaultValue: positionProfileDefaultValue },
  ];

  const parseCommandList = commandList.map((command) => {
    return { label: command.id, value: command.id };
  });
  const commandListCollection = createListCollection({
    items: parseCommandList,
  });

  const [render, setRender] = createSignal<boolean>(true);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        "row-gap": "0.5rem",
      }}
    >
      <Select.Root
        positioning={{ sameWidth: true }}
        width="2xs"
        size="xs"
        collection={commandListCollection}
        defaultValue={Object.keys(props.config)}
        onValueChange={(v) => {
          setRender(false);
          const findIndex = commandList.findIndex(
            (command) => command.id === v.value[0],
          );
          const defaultValue = commandList[findIndex]
            .defaultValue as CommandType;
          setCommand(reconcile(structuredClone(defaultValue)));
          setRender(true);
        }}
      >
        <Select.Control
          display={"grid"}
          gridTemplateColumns="50% 50%"
          alignItems="center"
        >
          <Text fontSize="sm">{"Command type"}</Text>
          <Select.Trigger>
            <Select.ValueText placeholder={`Select Command`} />
          </Select.Trigger>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            <For each={commandListCollection.items}>
              {(item) => (
                <Select.Item item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator></Select.ItemIndicator>
                </Select.Item>
              )}
            </For>
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
      <Show when={render()}>
        <Form
          value={command[Object.keys(command)[0] as keyof typeof command]}
          id={`${props.id}.${"command"}`}
          style={{ "padding-left": "1rem" }}
          format={props.format}
          description={
            props.description
              ? props.description[
                  Object.keys(command)[0] as keyof typeof command
                ]
              : props.description
          }
          originalFile={
            props.originalFile
              ? props.originalFile[
                  Object.keys(command)[0] as keyof typeof command
                ]
              : props.originalFile
          }
          onItemChange={() => {
            props.onItemChange?.();
          }}
          accordionStates={props.accordionStates}
        />
      </Show>
    </div>
  );
}
