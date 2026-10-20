import { For, Show } from "solid-js";
import { StateType } from "src-tauri/generated/config/ConfigType";
import { css, cx } from "styled-system/css";
import { Text } from "~/components/ui/text";
import { prettierLabel } from "~/utils/PrettierLabel";
import { AccordionStates } from "./ConfigForm";
import * as Accordion from "../../../components/ui/accordion";
import { IconChevronDown, IconHelp } from "@tabler/icons-solidjs";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/icon-button";

type DriverStatusProps = {
  id: string;
  driverStatus: StateType;
  accordionStatuses?: AccordionStates;
  description?: object;
};

// Since the Driver status is immutable, It has a seperate components.
export function DriverStatus(props: DriverStatusProps) {
  return (
    <div
      class={css({
        display: "grid",
        gridTemplateRows: `2rem minmax(0, 1fr)`,
        width: "100%",
        height: "100%",
        borderLeftWidth: "1px",
        minWidth: "22rem",
      })}
    >
      <div
        class={css({
          background: "gray.2",
        })}
        style={{
          width: "100%",
          height: "100%",
          "grid-row": 1,
          display: "flex",
          "align-items": "center",
          "padding-left": "0.4rem",
        }}
      >
        <Text fontSize="sm" fontFamily="body" fontWeight={"bold"}>
          {"Driver status"}
        </Text>
      </div>
      <div
        class={css({})}
        style={{
          width: "100%",
          height: "100%",
          "grid-row": 2,
          "border-top-width": "1px",
          padding: "0.5rem",
          "overflow-y": "auto",
        }}
      >
        <div style={{ "border-width": "1px" }}>
          <DriverStatusTable
            id={props.id}
            branch={props.driverStatus}
            accordionStatus={props.accordionStatuses}
            paddingLeft={0}
            description={
              props.description
                ? props.description["state" as keyof typeof props.description]
                : props.description
            }
          />
        </div>
      </div>
    </div>
  );
}

const DriverStatusTable = (props: {
  id: string;
  branch: object;
  paddingLeft?: number;
  accordionStatus?: AccordionStates;
  description?: object;
}) => {
  const entries = Object.entries(props.branch);
  const objectEntries = entries.filter(
    ([, value]) => typeof value === "object",
  );
  const noneObjectEntries = entries.filter(
    ([, value]) => typeof value !== "object",
  );

  return (
    <>
      <Show when={noneObjectEntries.length > 0}>
        <div
          style={{
            width: "100%",
            height: "fit-content",
            display: "grid",
            "grid-template-columns": "50% minmax(0,1fr)",
            "grid-auto-rows": "1.5rem",
          }}
        >
          <For each={noneObjectEntries}>
            {([key, value], index) => {
              const rowNumber = index() + 1;
              const description = props.description
                ? props.description[
                    `__${key}` as keyof typeof props.description
                  ]
                : props.description;
              const descriptionText = description
                ? description["description" as keyof typeof description]
                : description;
              const unitShort = description
                ? description["unit_short" as keyof typeof description]
                : description;
              const unitLong = description
                ? description["unit_long" as keyof typeof description]
                : description;

              return (
                <>
                  <Text
                    gridColumn={1}
                    gridRow={rowNumber}
                    fontFamily={"body"}
                    fontSize="sm"
                    borderWidth={"0 1px 1px 0"}
                    background="gray.1"
                    style={{
                      "padding-left": props.paddingLeft
                        ? `${props.paddingLeft}rem`
                        : "0.2rem",
                      "white-space": "nowrap",
                    }}
                    display="flex"
                    alignItems="center"
                    gap="0"
                  >
                    {key.replaceAll("_", " ")}
                    <Show when={descriptionText}>
                      <Tooltip content={descriptionText}>
                        <IconButton
                          variant="plain"
                          color={"fg.subtle"}
                          size="2xs"
                        >
                          <IconHelp />
                        </IconButton>
                      </Tooltip>
                    </Show>
                  </Text>
                  <Text
                    gridColumn={2}
                    gridRow={rowNumber}
                    fontFamily={"body"}
                    fontSize="sm"
                    borderBottomWidth="1px"
                    paddingRight="0.4rem"
                    textAlign={"right"}
                    display={"flex"}
                    justifyContent="right"
                    alignItems="center"
                    columnGap="0.2rem"
                  >
                    {value.toString()}
                    <Show when={typeof unitShort === "string"}>
                      <Tooltip content={unitLong}>
                        <Text fontSize="sm" color="fg.subtle">
                          {unitShort}
                        </Text>
                      </Tooltip>
                    </Show>
                  </Text>
                </>
              );
            }}
          </For>
        </div>
      </Show>
      <Show when={objectEntries.length > 0}>
        <For each={objectEntries}>
          {([key, value], index) => {
            const id = props.id + "." + key;
            const label = key.replaceAll("_", " ");
            const accordionValue = label + "." + key;
            const description = props.description
              ? props.description[`${key}` as keyof typeof props.description]
              : props.description;
            const keyDescription = props.description
              ? props.description[`__${key}` as keyof typeof props.description]
              : props.description;
            const keyDescriptionText = keyDescription
              ? keyDescription["description" as keyof typeof keyDescription]
              : keyDescription;

            if (props.accordionStatus && !props.accordionStatus.has(id)) {
              props.accordionStatus.set(id, [accordionValue]);
            }

            return (
              <Accordion.Root
                borderWidth="0"
                defaultValue={
                  props.accordionStatus
                    ? props.accordionStatus.get(id)!
                    : undefined
                }
                onValueChange={(details) => {
                  if (props.accordionStatus) {
                    props.accordionStatus.set(id, details.value);
                  }
                }}
                multiple
              >
                <Accordion.Item
                  value={accordionValue}
                  padding="0"
                  borderWidth="0"
                >
                  <Accordion.ItemTrigger
                    borderBottomWidth="1px"
                    background="gray.1"
                    style={{
                      padding:
                        typeof props.paddingLeft === "number"
                          ? `0 0 0 ${props.paddingLeft}rem`
                          : `0 0 0 0.2rem`,
                    }}
                  >
                    <Text
                      class={css({
                        fontFamily: "body",
                        fontSize: "sm",
                        fontWeight: "normal",
                        alignItems: "center",
                      })}
                    >
                      {label}
                      <Show when={keyDescriptionText}>
                        <Tooltip content={keyDescriptionText}>
                          <IconButton
                            size="2xs"
                            color="fg.subtle"
                            variant="plain"
                          >
                            <IconHelp />
                          </IconButton>
                        </Tooltip>
                      </Show>
                    </Text>

                    <Accordion.ItemIndicator>
                      <IconChevronDown />
                    </Accordion.ItemIndicator>
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <DriverStatusTable
                      id={id}
                      branch={value}
                      paddingLeft={
                        typeof props.paddingLeft === "number"
                          ? props.paddingLeft + 0.5
                          : props.paddingLeft
                      }
                      accordionStatus={props.accordionStatus}
                      description={description}
                    />
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Accordion.Root>
            );
          }}
        </For>
      </Show>
    </>
  );
};
