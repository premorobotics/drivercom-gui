import { For, Show } from "solid-js";
import { StateAxesType } from "src-tauri/generated/config/ConfigType";
import { css } from "styled-system/css";
import { Text } from "~/components/ui/text";
import { HelpTooltip } from "~/components/HelpTooltip";

type DriverStatusAxesProps = {
  axes: StateAxesType[];
  description?: object[];
};

export function DriverStatusAxes(props: DriverStatusAxesProps) {
  const axesKey = Object.entries(props.axes[0]).sort(
    ([, a], [, b]) =>
      Number(typeof a === "object") - Number(typeof b === "object"),
  );
  const axesArray = Array.from(
    { length: props.axes.length },
    (_, i) => `axis${i + 1}`,
  );

  const getValue = (object: object, key: string, childKey: string) => {
    const parent = object[key as keyof object];
    if (typeof parent !== "object") return "";
    const child = parent[childKey as keyof typeof parent];
    const parseChildToNumber = Number(child);
    return isNaN(parseChildToNumber)
      ? child
      : Number(parseChildToNumber.toFixed(7));
  };

  const axisDescription = props.description
    ? props.description[0]
    : props.description;

  return (
    <div style={{ padding: "0.2rem" }}>
      <div
        class={css({
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 21% 21% 21% ",
          gridAutoRows: "1.5rem",
          borderWidth: "1px 1px 0px 1px",
        })}
      >
        <Text
          fontSize="sm"
          gridRow="span 1"
          gridColumn="span 1"
          background="gray.3"
          borderBottomWidth="1px"
        />
        <For each={axesArray}>
          {(axesLabel) => {
            return (
              <Text
                fontSize="sm"
                background="gray.3"
                borderBottomWidth="1px"
                borderLeftWidth="1px"
                paddingLeft="0.2rem"
                textAlign="center"
              >
                {axesLabel}
              </Text>
            );
          }}
        </For>
        <For each={axesKey}>
          {([key, value]) => {
            const label = key.replaceAll("_", " ");
            if (typeof value !== "object") {
              const childDescription = axisDescription
                ? axisDescription[`__${key}` as keyof typeof axisDescription]
                : axisDescription;
              const descriptionText = childDescription
                ? childDescription[
                    `description` as keyof typeof childDescription
                  ]
                : childDescription;
              return (
                <>
                  <Text
                    fontSize="sm"
                    whiteSpace="nowrap"
                    gridRow="span 1"
                    gridColumn="span 1"
                    borderBottomWidth="1px"
                    paddingLeft="0.2rem"
                  >
                    {label}
                    <Show when={descriptionText}>
                      <HelpTooltip content={descriptionText} />
                    </Show>
                  </Text>
                  <Text
                    fontSize="sm"
                    gridRow="span 1"
                    gridColumn="span 1"
                    borderBottomWidth="1px"
                    borderLeftWidth="1px"
                    paddingRight="0.2rem"
                    textAlign="right"
                  >
                    {props.axes[0][key as keyof StateAxesType].toString()}
                  </Text>
                  <Text
                    fontSize="sm"
                    gridRow="span 1"
                    gridColumn="span 1"
                    borderBottomWidth="1px"
                    borderLeftWidth="1px"
                    paddingRight="0.2rem"
                    textAlign="right"
                  >
                    {props.axes[1][key as keyof StateAxesType].toString()}
                  </Text>
                  <Text
                    fontSize="sm"
                    gridRow="span 1"
                    gridColumn="span 1"
                    borderBottomWidth="1px"
                    borderLeftWidth="1px"
                    paddingRight="0.2rem"
                    textAlign="right"
                  >
                    {props.axes[2][key as keyof StateAxesType].toString()}
                  </Text>
                </>
              );
            } else {
              const parentDescription = axisDescription
                ? axisDescription[`${key}` as keyof typeof axisDescription]
                : axisDescription;
              const parentDescriptionMeta = axisDescription
                ? axisDescription[`__${key}` as keyof typeof axisDescription]
                : axisDescription;
              const parentDescriptionText = parentDescriptionMeta
                ? parentDescriptionMeta[
                    `description` as keyof typeof parentDescriptionMeta
                  ]
                : parentDescriptionMeta;
              return (
                <>
                  <Text
                    gridColumn="span 4"
                    fontSize="sm"
                    background="gray.3"
                    borderBottomWidth="1px"
                  >
                    {label}
                    <Show when={parentDescriptionText}>
                      <HelpTooltip content={parentDescriptionText} />
                    </Show>
                  </Text>
                  <For each={Object.entries(value)}>
                    {([childKey, childValue]) => {
                      const childLabel = childKey.replaceAll("_", " ");
                      const childDescription = parentDescription
                        ? parentDescription[
                            `__${childKey}` as keyof typeof parentDescription
                          ]
                        : parentDescription;
                      const descriptionText = childDescription
                        ? childDescription[
                            `description` as keyof typeof childDescription
                          ]
                        : childDescription;

                      if (typeof childValue !== "object") {
                        return (
                          <>
                            <Text
                              fontSize="sm"
                              gridRow="span 1"
                              gridColumn="span 1"
                              borderBottomWidth="1px"
                              paddingLeft="0.2rem"
                            >
                              {childLabel}
                              <Show when={descriptionText}>
                                <HelpTooltip content={descriptionText} />
                              </Show>
                            </Text>
                            <Text
                              fontSize="sm"
                              gridRow="span 1"
                              gridColumn="span 1"
                              borderBottomWidth="1px"
                              borderLeftWidth="1px"
                              paddingRight="0.2rem"
                              textAlign="right"
                            >
                              {getValue(props.axes[0], key, childKey)}
                            </Text>
                            <Text
                              fontSize="sm"
                              gridRow="span 1"
                              gridColumn="span 1"
                              borderBottomWidth="1px"
                              borderLeftWidth="1px"
                              paddingRight="0.2rem"
                              textAlign="right"
                            >
                              {getValue(props.axes[1], key, childKey)}
                            </Text>
                            <Text
                              fontSize="sm"
                              gridRow="span 1"
                              gridColumn="span 1"
                              borderBottomWidth="1px"
                              borderLeftWidth="1px"
                              paddingRight="0.2rem"
                              textAlign="right"
                            >
                              {getValue(props.axes[2], key, childKey)}
                            </Text>
                          </>
                        );
                      }
                    }}
                  </For>
                </>
              );
            }
          }}
        </For>
      </div>
    </div>
  );
}
