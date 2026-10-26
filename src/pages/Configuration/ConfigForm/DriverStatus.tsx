import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
} from "solid-js";
import { StateType } from "src-tauri/generated/config/ConfigType";
import { css } from "styled-system/css";
import { Text } from "~/components/ui/text";
import { AccordionStates } from "./ConfigForm";
import * as Accordion from "../../../components/ui/accordion";
import { IconChevronDown, IconHelp, IconRefresh } from "@tabler/icons-solidjs";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/icon-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DrivercomCommandButton } from "./DrivercomCommandButton";
import { getConfigFromPort, toggleServo } from "~/services/PortService";
import { createStore, reconcile } from "solid-js/store";
import { toaster } from "~/components/ui/toast";
import { trackStore } from "@solid-primitives/deep";
import { DriverStatusAxes } from "./DriverStatusAxes";
import { DriverStatusSectionCount } from "./DrivreStatusSectionCount";

type DriverStatusProps = {
  id: string;
  driverStatus: StateType;
  accordionStatuses?: AccordionStates;
  description?: object;
};

// Since the Driver status is immutable, It has a seperate components.
export function DriverStatus(props: DriverStatusProps) {
  const [driverStatus, setDriverStatus] = createStore<StateType>(
    props.driverStatus,
  );
  const stateDecription = props.description
    ? props.description["state" as keyof typeof props.description]
    : props.description;

  createEffect(
    on(
      () => trackStore(props.driverStatus),
      () => {
        setDriverStatus(props.driverStatus);
      },
      { defer: true },
    ),
  );

  const DriverStatusReactiveTable = createMemo(
    on(
      () => [trackStore(driverStatus)],
      () => {
        return (
          <DriverStatusTable
            id={props.id}
            branch={driverStatus}
            accordionStatus={props.accordionStatuses}
            paddingLeft={0}
            description={stateDecription}
          />
        );
      },
    ),
  );

  const [isToggleButtonLoading, setIsToggleButtonLoading] =
    createSignal<boolean>(false);
  const [isReseting, setIsReseting] = createSignal<boolean>(false);

  return (
    <div
      class={css({
        display: "grid",
        gridTemplateRows: `2rem 3.2rem minmax(0, 1fr)`,
        width: "100%",
        height: "100%",
        borderLeftWidth: "1px",
        background: "gray.2",
        minWidth: "30rem",
      })}
    >
      <div
        style={{
          width: "100%",
          height: "2rem",
          "grid-row": 1,
          display: "grid",
          "align-items": "center",
          "padding-left": "0.4rem",
          "grid-template-columns": "5.4rem 4rem minmax(0,1fr)",
        }}
      >
        <Text fontSize="sm" fontFamily="body" fontWeight={"bold"}>
          {"Driver status"}
        </Text>

        <Badge size="sm">{"Read only"}</Badge>

        <div
          style={{
            display: "flex",
            "justify-content": "right",
          }}
        >
          <DrivercomCommandButton
            onRunCommand={async (port, version) => {
              if (isToggleButtonLoading()) return;
              try {
                setIsToggleButtonLoading(true);
                await toggleServo(port, driverStatus.servo_enabled);
                const newConfig = await getConfigFromPort(port, version);
                setDriverStatus(reconcile(newConfig.state));
                setIsToggleButtonLoading(false);
              } catch (e) {
                setIsToggleButtonLoading(false);
                toaster.create({
                  title: "Toggle Servo Error",
                  description: e as string,
                  type: "error",
                });
              }
            }}
            tooltipContent={"Enable or disable the servo."}
          >
            <Button
              variant={"outline"}
              size="2xs"
              fontWeight="normal"
              loading={isToggleButtonLoading()}
            >
              {driverStatus.servo_enabled ? "Disable servo" : "Enable servo"}
            </Button>
          </DrivercomCommandButton>
          <DrivercomCommandButton
            onRunCommand={async (port, version) => {
              if (isReseting()) return;
              try {
                setIsReseting(true);
                const newConfig = await getConfigFromPort(port, version);
                setDriverStatus(reconcile(newConfig.state));
                setIsReseting(false);
              } catch (e) {
                setIsReseting(false);
                toaster.create({
                  title: "Refresh Driver status Error",
                  description: e as string,
                  type: "error",
                });
              }
            }}
            tooltipContent={"Refresh Driver status"}
          >
            <IconButton variant="plain" size="2xs" loading={isReseting()}>
              <IconRefresh />
            </IconButton>
          </DrivercomCommandButton>
        </div>
      </div>
      <div
        class={css({
          width: "100%",
          height: "100%",
        })}
        style={{
          "grid-row": 2,
          padding: "0.4rem",
          "border-top-width": "1px",
        }}
      >
        <div
          class={css({
            background: "Canvas",
            borderRadius: "0.25rem",
            boxShadow: "sm",
          })}
          style={{
            width: "100%",
            height: "100%",
            padding: "0.2rem",
            display: "grid",
            "grid-template-columns": `repeat(2, calc(100% / 3)) minmax(0,1fr)`,
            gap: "0.2rem",
            "border-width": "1px",
          }}
        >
          <Badge
            size="2xl"
            gridRow="1"
            gridColumn="1"
            display="flex"
            fontSize="sm"
            paddingLeft="0.2rem"
            paddingRight="0.2rem"
            variant="outline"
            background="accent.3"
            borderColor="accent.7"
            color="accent.11"
          >
            {"Firmware"}
            <Text textAlign="right" fontWeight="bold" width="100%">
              {`v${driverStatus.sys_version}`}
            </Text>
          </Badge>
          <Badge
            size="2xl"
            gridRow="1"
            gridColumn="2"
            display="flex"
            fontSize="sm"
            paddingLeft="0.2rem"
            paddingRight="0.2rem"
            variant="outline"
            background={driverStatus.cc_link_enabled ? "accent.3" : "accent.1"}
            borderColor={driverStatus.cc_link_enabled ? "accent.7" : "border"}
            color={driverStatus.cc_link_enabled ? "accent.11" : "fg.muted"}
          >
            {`CC Link`}
            <Text textAlign="right" fontWeight="bold" width="100%">
              {`${driverStatus.cc_link_enabled ? "on" : "off"}`}
            </Text>
          </Badge>

          <Badge
            margin="0"
            size="2xl"
            gridRow="1"
            gridColumn="3"
            display="flex"
            fontSize="sm"
            paddingLeft="0.2rem"
            paddingRight="0.2rem"
            variant="outline"
            background={driverStatus.servo_enabled ? "accent.3" : "accent.1"}
            borderColor={driverStatus.servo_enabled ? "accent.7" : "border"}
            color={driverStatus.servo_enabled ? "accent.11" : "fg.muted"}
          >
            {`Servo`}
            <Text textAlign="right" fontWeight="bold" width="100%">
              {`${driverStatus.servo_enabled ? "on" : "off"}`}
            </Text>
          </Badge>
        </div>
      </div>
      <div
        style={{
          width: "100%",
          height: "100%",
          "grid-row": 3,
          padding: "0 0.5rem 0.2rem 0.5rem",
          "padding-top": "0",
          "overflow-y": "auto",
        }}
      >
        <div style={{ "border-width": "1px" }}>
          {DriverStatusReactiveTable()}
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
  const notIncludedKeys = ["servo_enabled", "cc_link_enabled", "sys_version"];
  const objectEntries = entries.filter(
    ([, value]) => typeof value === "object",
  );
  const noneObjectEntries = entries.filter(
    ([key, value]) =>
      typeof value !== "object" && !notIncludedKeys.includes(key),
  );

  return (
    <>
      <Show when={noneObjectEntries.length > 0}>
        <div
          style={{
            width: "100%",
            height: "fit-content",
            display: "grid",
            "grid-template-columns": "25% 25% 25% minmax(0,1fr)",
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
                    gridColumn={"span 1"}
                    gridRow={rowNumber}
                    fontFamily={"body"}
                    fontSize="sm"
                    borderWidth={"0 0px 1px 0"}
                    style={{
                      "padding-left": props.paddingLeft
                        ? `${props.paddingLeft}rem`
                        : "0.2rem",
                      "white-space": "nowrap",
                    }}
                    display="flex"
                    alignItems="center"
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
                    gridColumn={"span 1"}
                    gridRow={rowNumber}
                    fontFamily={"body"}
                    fontSize="sm"
                    borderRightWidth={index() % 2 === 0 ? "1px" : "0"}
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
          {([key, value]) => {
            const id = props.id + "." + key;
            const label = !isNaN(Number(key))
              ? `Axis ${Number(key) + 1}`
              : key[0].toUpperCase() +
                key.slice(1, key.length).replaceAll("_", " ");
            const accordionValue = props.id.split(".").pop() + key;
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
                    background="gray.2"
                    style={{
                      padding:
                        typeof props.paddingLeft === "number"
                          ? `0 0 0 ${props.paddingLeft === 0 ? 0.2 : props.paddingLeft}rem`
                          : `0 0 0 0.2rem`,
                    }}
                  >
                    <Text
                      class={css({
                        fontFamily: "body",
                        fontSize: "sm",
                        fontWeight: "medium",
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
                    <Show
                      when={key !== "section_count" && key !== "axes"}
                      fallback={
                        <Show
                          when={key === "section_count"}
                          fallback={
                            <DriverStatusAxes
                              axes={value}
                              description={description}
                            />
                          }
                        >
                          <DriverStatusSectionCount
                            sectionCount={value}
                            description={description}
                          />
                        </Show>
                      }
                    >
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
                    </Show>
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
