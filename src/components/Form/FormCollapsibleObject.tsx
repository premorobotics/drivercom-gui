import * as Accordion from "../ui/accordion";
import { Text } from "../ui/text";
import { Stack } from "styled-system/jsx";
import { Show } from "solid-js";
import { Form, FormProps } from "../Form";
import { createSignal } from "solid-js";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { LoggingCommandTable } from "~/pages/Logging/LoggingForm/LoggingCommandTable";
import { CommandType } from "src-tauri/generated/config/LogConfigType";

export type FormCollapsibleObjectProps = FormProps & {
  key: string;
  triggerDescription?: object;
};

export const FormCollapsibleObject = (props: FormCollapsibleObjectProps) => {
  const itemId = props.id + props.key;
  if (!props.accordionStates.has(itemId)) {
    props.accordionStates.set(itemId, createSignal<string[]>([itemId]));
  }
  const [accordionValue, setAccordionValue] =
    props.accordionStates.get(itemId)!;

  const key = props.key;
  const value = props.value;

  return (
    <Accordion.Root
      value={accordionValue()}
      onValueChange={(details) => {
        setAccordionValue(details.value);
      }}
      multiple
      padding="0.2rem"
      outlineWidth="1px"
      borderWidth="1px"
      borderRadius="0.2rem"
    >
      <Accordion.Item value={itemId} borderWidth="0" padding="0">
        <Accordion.ItemTrigger padding="0">
          <Stack gap="0" alignItems={"center"}>
            <Text
              fontWeight="bold"
              color="fg.default"
              textStyle="xs"
              width="100%"
            >
              {`${key[0].toUpperCase()}${Array.from(key.slice(1, key.length))
                .map((char, index) => {
                  if (key[index] === "_") {
                    return char.toUpperCase();
                  }
                  return char;
                })
                .toString()
                .replaceAll(",", "")}`}
            </Text>
            <Show when={props.triggerDescription}>
              <Text textStyle="xs" fontWeight="light" color="fg.muted">
                {
                  props.triggerDescription![
                    "description" as keyof typeof props.triggerDescription
                  ]
                }
              </Text>
            </Show>
          </Stack>
          <Accordion.ItemIndicator>
            <IconChevronDown />
          </Accordion.ItemIndicator>
        </Accordion.ItemTrigger>

        <Accordion.ItemContent>
          <Show
            when={props.key !== "command"}
            fallback={
              <LoggingCommandTable
                id={`${props.id}.${key}`}
                config={value as CommandType}
                defaultValue={Object.keys(value)[0]}
                format={props.format}
                description={props.description}
                originalFile={props.originalFile}
                changeUnits={props.changeUnits}
                onItemChange={() => {
                  props.onItemChange?.();
                }}
                accordionStates={props.accordionStates}
              />
            }
          >
            <Form
              value={value}
              id={`${props.id}.${key}`}
              style={{ "padding-left": "1rem" }}
              format={props.format}
              description={props.description}
              originalFile={props.originalFile}
              changeUnits={props.changeUnits}
              onItemChange={() => {
                props.onItemChange?.();
              }}
              accordionStates={props.accordionStates}
              logStartCombinators={props.logStartCombinators}
              logStartConditions={props.logStartConditions}
            />
          </Show>
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};
