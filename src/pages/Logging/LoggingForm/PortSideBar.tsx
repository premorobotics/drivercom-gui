import { LogConfigType } from "src-tauri/generated/config/LogConfigType.tsx";
import { createStore } from "solid-js/store";
import { FormNumberInput } from "~/components/Form/FormNumberInput.tsx";
import { LoggingCommandTable } from "./LoggingCommandTable.tsx";
import * as Checkbox from "../../../components/ui/checkbox.tsx";
import { DrivercomCommandButton } from "../../Configuration/ConfigForm/DrivercomCommandButton.tsx";
import { For } from "solid-js";
import { Text } from "~/components/ui/text.tsx";
import { css } from "styled-system/css/css";
import { Button } from "~/components/ui/button.tsx";
import { AccordionStates } from "~/pages/Configuration/ConfigForm/ConfigForm.tsx";

type PortSideBarProps = {
  id: string;
  config: LogConfigType;
  duration?: number;
  onStartLogging?: (portId: string) => void;
  accordionStates: AccordionStates;
};

export function PortSideBar(props: PortSideBarProps) {
  const [logConfig, setLogConfig] = createStore<LogConfigType>(props.config);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          "border-bottom-width": "1px",
          "padding-bottom": "0.8rem",
          display: "flex",
          "row-gap": "0.4rem",
          "grid-auto-rows": "minmax(2rem, auto)",
          "flex-direction": "column",
          width: "100%",
        }}
        class={css({ fontSize: "sm" })}
      >
        <Text fontSize="sm" fontWeight="medium" gridRow="span 1">
          {"Settings"}
        </Text>
        <FormNumberInput
          id={`${props.id}.duration`}
          label={"duration"}
          inputValue={logConfig.duration}
          onInputChange={(value) => {
            setLogConfig("duration", value);
          }}
        />
        <div
          class={css({
            width: "100%",
            padding: "0.2rem",
            outlineStyle: "solid",
            outlineWidth: "1px",
            outlineColor: "border",
            borderRadius: "xs",
            background: "Canvas",
          })}
        >
          <Text> {"Axes"}</Text>
          <div
            class={css({
              display: "grid",
              gridTemplateColumns: "33% 33% minmax(0,1fr)",
            })}
          >
            <For each={Object.keys(logConfig.axes)}>
              {(axisId) => {
                return (
                  <Checkbox.Root
                    size="sm"
                    checked={
                      logConfig.axes[axisId as keyof typeof logConfig.axes]
                    }
                    onCheckedChange={(changedDetails) => {
                      setLogConfig(
                        "axes",
                        axisId as keyof typeof logConfig.axes,
                        changedDetails.checked ? true : false,
                      );
                    }}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control borderColor={"gray.7"}>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label fontWeight={"normal"}>
                      {axisId}
                    </Checkbox.Label>
                  </Checkbox.Root>
                );
              }}
            </For>
          </div>
        </div>
        <div
          class={css({
            width: "100%",
            padding: "0.2rem",
            outlineStyle: "solid",
            outlineWidth: "1px",
            outlineColor: "border",
            borderRadius: "xs",
            background: "Canvas",
          })}
        >
          <LoggingCommandTable
            id={`${props.id}.command`}
            accordionStates={props.accordionStates}
            config={logConfig.command}
            defaultValue={Object.keys(logConfig.command)[0]}
          />
        </div>
        <DrivercomCommandButton
          onRunCommand={(portId) => props.onStartLogging?.(portId)}
        >
          <Button size="2xs" class={css({ padding: "0" })} gridColumn="span 2">
            {"Start Logging"}
          </Button>
        </DrivercomCommandButton>
      </div>
    </div>
  );
}
