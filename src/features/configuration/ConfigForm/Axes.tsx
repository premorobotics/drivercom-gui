import { createStore } from "solid-js/store";
import { css } from "styled-system/css";
import { createSignal, For, JSX, Show, splitProps } from "solid-js";
import { Text } from "~/components/ui/text";
import { AccordionStates } from "./ConfigForm";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/icon-button";
import {
  IconChevronDown,
  IconExclamationCircle,
  IconHelp,
} from "@tabler/icons-solidjs";
import { Dynamic } from "solid-js/web";
import * as Accordion from "../../../components/ui/accordion";
import { getComputedCSSVariableValue } from "~/utils/GetComputedCssVariableValue";

type AxesTableProps = {
  id: string;
  config: object[];
  format: object[];
  description?: object;
  accordionStatuses?: AccordionStates;
  paddingLeft?: number;
  changeUnit?: boolean;
};

export function Axes(props: AxesTableProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "fit-content",
        "border-width": "1px",
      }}
    >
      <div
        style={{
          display: "grid",
          "grid-template-columns": `repeat(4, 25%)`,
          "grid-auto-rows": "1.5rem",
        }}
      >
        <div
          class={css({ background: "gray.2" })}
          style={{ "grid-column": "1", "grid-row": "1" }}
        ></div>
        <For
          each={Array.from({ length: props.config.length }, (_, i) => i + 1)}
        >
          {(axisId, index) => {
            const rowNumber = 1;
            const columnId = index() + 2;
            return (
              <>
                <Text
                  background={"gray.2"}
                  fontSize="xs"
                  gridColumn={columnId}
                  gridRow={rowNumber}
                  borderLeftWidth="1px"
                  paddingLeft="0.2rem"
                  textAlign="center"
                  fontFamily={"body"}
                  paddingTop="0.2rem"
                >
                  {`Axis ${axisId}`}
                </Text>
              </>
            );
          }}
        </For>
      </div>

      <AxesTable
        id={props.id}
        config={props.config}
        description={props.description}
        format={props.format}
        accordionStatuses={props.accordionStatuses}
        paddingLeft={0}
        changeUnit={props.changeUnit}
      />
    </div>
  );
}

export function AxesTable(props: AxesTableProps) {
  const [config, setConfig] = createStore(props.config);
  const setConfigWithIndex = (index: number, key: string, value: number) => {
    setConfig(
      index,
      key as keyof (typeof config)[number],
      //@ts-ignore Type is already checked.
      value,
    );
  };
  const noneObjectSideKeys = Object.entries(props.format[0]).filter(
    ([, value]) => typeof value !== "object",
  );
  const objectSideKeys = Object.entries(props.format[0]).filter(
    ([, value]) => typeof value === "object",
  );
  const configIndexes = Array.from(
    { length: props.config.length },
    (_, i) => i,
  );

  const paddingLeft = props.paddingLeft ?? 0.2;

  return (
    <div style={{ width: "100%", height: "fit-content" }}>
      <div
        class={css({
          width: "100%",
          height: "fit-content",
          display: "grid",
          gridTemplateColumns: `repeat(4, 25%)`,
          gridAutoRows: "1.8rem",
          borderRadius: "0.2rem",
          gap: "0",
        })}
      >
        <Show when={noneObjectSideKeys.length > 0}>
          <For each={noneObjectSideKeys}>
            {([key], index) => {
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
                    style={{
                      "padding-left": `${typeof paddingLeft === "number" && paddingLeft > 0 ? paddingLeft : 0.2}rem`,
                    }}
                    fontSize="sm"
                    gridColumn={"1"}
                    gridRow={rowNumber}
                    borderTopWidth={"1px"}
                    display={"flex"}
                    background={"gray.2"}
                    fontFamily={"body"}
                    alignItems="center"
                  >
                    {key.replaceAll("_", " ")}
                    <Show when={descriptionText}>
                      <Tooltip content={descriptionText}>
                        <IconButton
                          size="2xs"
                          variant="plain"
                          color={"fg.subtle"}
                        >
                          <IconHelp />
                        </IconButton>
                      </Tooltip>
                    </Show>
                  </Text>
                  <For each={configIndexes}>
                    {(configIndex) => {
                      const columnNumber = configIndex + 2;
                      return (
                        <ComlumnInput
                          style={{
                            "grid-column": columnNumber,
                            "grid-row": rowNumber,
                            "border-top-width": "1px",
                            "border-left-width": "1px",
                            padding: "0.2rem",
                          }}
                          value={
                            config[configIndex][
                              key as keyof (typeof config)[number]
                            ]
                          }
                          onChange={(value: number) => {
                            setConfigWithIndex(configIndex, key, value);
                          }}
                          unitShort={unitShort}
                          unitLong={unitLong}
                          changeUnit={props.changeUnit}
                        />
                      );
                    }}
                  </For>
                </>
              );
            }}
          </For>
        </Show>
      </div>
      <Show when={objectSideKeys.length > 0}>
        <For each={objectSideKeys}>
          {([objectKey]) => {
            const format = props.format.map(
              (format) => format[objectKey as keyof typeof format] as object,
            );
            const innerConfig = config.map(
              (config) => config[objectKey as keyof typeof config] as object,
            );
            const description = props.description
              ? props.description[objectKey as keyof typeof props.description]
              : props.description;

            const id = props.id + "." + objectKey;
            const label = props.id.split(".").pop();
            const accordionItemValue = label + "." + objectKey;
            if (props.accordionStatuses && !props.accordionStatuses.has(id)) {
              props.accordionStatuses.set(id, [accordionItemValue]);
            }
            return (
              <Accordion.Root
                width={"100%"}
                borderWidth="0"
                multiple
                defaultValue={
                  props.accordionStatuses
                    ? props.accordionStatuses.get(id)!
                    : undefined
                }
                onValueChange={(details) => {
                  if (props.accordionStatuses) {
                    props.accordionStatuses.set(id, details.value);
                  }
                }}
              >
                <Accordion.Item value={accordionItemValue} borderWidth="0">
                  <Accordion.ItemTrigger
                    style={{
                      "padding-left": `${typeof paddingLeft === "number" && paddingLeft > 0 ? paddingLeft : 0.2}rem`,
                    }}
                    fontSize="xs"
                    fontWeight="medium"
                    background={"gray.2"}
                    borderTopWidth="1px"
                    borderRadius="0"
                    padding={"0 0 0 0.2rem"}
                    gap="0"
                  >
                    <Text fontFamily={"body"}>
                      {objectKey[0].toUpperCase() +
                        objectKey.slice(1, objectKey.length)}
                    </Text>
                    <Accordion.ItemIndicator fontSize={"sm"}>
                      <IconChevronDown />
                    </Accordion.ItemIndicator>
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <AxesTable
                      id={id}
                      format={format}
                      config={innerConfig}
                      description={description}
                      accordionStatuses={props.accordionStatuses}
                      paddingLeft={
                        typeof props.paddingLeft === "number"
                          ? props.paddingLeft + 0.5
                          : props.paddingLeft
                      }
                      changeUnit={props.changeUnit}
                    />
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Accordion.Root>
            );
          }}
        </For>
      </Show>
    </div>
  );
}

type ComlumnInputProps = {
  value: number;
  unitShort?: string;
  unitLong?: string;
  onChange?: (value: number) => void;
  changeUnit?: boolean;
} & Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange">;

function ComlumnInput(props: ComlumnInputProps) {
  const [, res] = splitProps(props, ["onChange", "value"]);
  const [errorInput, setErrorInput] = createSignal<string | null>(null);
  let container: HTMLDivElement | undefined;

  const parseValue = (value: number) =>
    Number.isInteger(value) ? value : Number(value.toFixed(7).toString());

  const inputValue = () =>
    props.unitShort
      ? changeValue(
          props.unitShort,
          parseValue(props.value),
          props.changeUnit ?? false,
        )
      : parseValue(props.value);

  const changeUnitShort = (unitShort: string, isMillimeter: boolean) => {
    const parseUnit = unitShort.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "m") {
        return "mm";
      } else if (parseUnit === "m/s") {
        return "mm/s";
      } else if (parseUnit === "m/s²") {
        return "mm/s²";
      } else {
        return unitShort;
      }
    } else {
      if (parseUnit === "mm") {
        return "m";
      } else {
        return unitShort;
      }
    }
  };

  const changeUnitLong = (unitLong: string, isMillimeter: boolean) => {
    const parseUnit = unitLong.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "meter") {
        return "Millimeter";
      } else if (parseUnit === "meters per second") {
        return "Millimeters Per Second";
      } else if (parseUnit === "meters per second squared") {
        return "Millimeters per Second squared";
      } else {
        return unitLong;
      }
    } else {
      if (parseUnit === "millimeter") {
        return "meter";
      } else {
        return unitLong;
      }
    }
  };

  const changeValue = (
    unitShort: string,
    value: number,
    isMillimeter: boolean,
  ) => {
    const parseUnit = unitShort.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "m") {
        return value * 1000;
      } else if (parseUnit === "m/s") {
        return value * 1000;
      } else if (parseUnit === "m/s²") {
        return value * 1000;
      } else {
        return value;
      }
    } else {
      if (parseUnit === "mm") {
        return value * 0.001;
      } else {
        return value;
      }
    }
  };

  const setChangedValue = (
    unitShort: string,
    value: number,
    isMillimeter: boolean,
  ) => {
    const parseUnit = unitShort.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "m") {
        return value * 0.001;
      } else if (parseUnit === "m/s") {
        return value * 0.001;
      } else if (parseUnit === "m/s²") {
        return value * 0.001;
      } else {
        return value;
      }
    } else {
      if (parseUnit === "mm") {
        return value * 100;
      } else {
        return value;
      }
    }
  };

  return (
    <div {...res}>
      <div
        ref={container}
        class={css({
          display: "flex",
          paddingLeft: "0.2rem",
          paddingRight: "0.2rem",
          columnGap: "0.2rem",
          width: "100%",
          height: "100%",
          outlineStyle: "solid",

          outlineColor:
            errorInput() || !Number.isFinite(props.value) ? "red" : "gray.7",
          outlineWidth: "1px",
          borderRadius: "0.1rem",
          position: "relative",
          zIndex: "1",
          alignItems: "center",
        })}
      >
        <input
          class={css({
            textAlign: "right",
            outline: "none",
            flex: 1,
            width: "100%",
            fontSize: "sm",
          })}
          value={errorInput() ?? inputValue()}
          onFocus={() => {
            if (container) {
              container.style.outlineWidth = "2px";
              container.style.outlineColor =
                typeof errorInput() === "string" ||
                !Number.isFinite(Number(inputValue()))
                  ? "red"
                  : getComputedCSSVariableValue("--colors-accent-9");
            }
          }}
          onFocusOut={() => {
            if (container) {
              container.style.outlineWidth = "1px";
              container.style.outlineColor =
                typeof errorInput() === "string" ||
                !Number.isFinite(Number(inputValue()))
                  ? "red"
                  : getComputedCSSVariableValue("--colors-gray-7");
            }
          }}
          onChange={(e) => {
            const value = e.target.value;
            let changeValueToNumber = Number(value);
            if (isNaN(Number(changeValueToNumber))) {
              setErrorInput(value);
            } else {
              if (errorInput()) {
                setErrorInput(null);
              }
              if (props.unitShort) {
                changeValueToNumber = setChangedValue(
                  props.unitShort,
                  changeValueToNumber,
                  props.changeUnit ?? false,
                );
              }
              props.onChange?.(changeValueToNumber);
            }
          }}
        />
        <Show when={props.unitShort}>
          <Tooltip
            disabled={!props.unitLong}
            content={
              props.unitLong
                ? changeUnitLong(props.unitLong, props.changeUnit ?? false)
                : props.unitLong
            }
          >
            <Text
              color={"fg.subtle"}
              fontSize="xs"
              width="fit-content"
              flex="none"
              fontFamily="body"
              paddingTop="0.2rem"
            >
              {props.unitShort
                ? changeUnitShort(props.unitShort, props.changeUnit ?? false)
                : props.unitShort}
            </Text>
          </Tooltip>
        </Show>
        <Show when={errorInput() || !Number.isFinite(props.value)}>
          <Dynamic
            style={{
              color: "red",
              width: "1rem",
              height: "1rem",
              flex: "none",
            }}
            component={IconExclamationCircle}
          />
        </Show>
      </div>
    </div>
  );
}
