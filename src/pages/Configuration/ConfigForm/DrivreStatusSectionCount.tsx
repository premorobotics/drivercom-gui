import { For, Show } from "solid-js";
import { StateSection_countType } from "src-tauri/generated/config/ConfigType";
import { css } from "styled-system/css";
import { Text } from "~/components/ui/text";
import { HelpTooltip } from "~/components/HelpTooltip";

type DriverStatusSectionCountProps = {
  sectionCount: StateSection_countType;
  description?: object;
};

export function DriverStatusSectionCount(props: DriverStatusSectionCountProps) {
  const valueKeys = Object.keys(
    props.sectionCount.activate_primary.left.forward,
  );

  console.log(props.description);
  return (
    <>
      <For each={Object.entries(props.sectionCount)}>
        {([accordionKey, accordionValue]) => {
          if (typeof accordionValue === "object") {
            const parentDescription = props.description
              ? props.description[
                  accordionKey as keyof typeof props.description
                ]
              : props.description;
            const parentDescriptionMeta = props.description
              ? props.description[
                  `__${accordionKey}` as keyof typeof props.description
                ]
              : props.description;
            const parentDesciriptionText = parentDescriptionMeta
              ? parentDescriptionMeta[
                  `description` as keyof typeof parentDescriptionMeta
                ]
              : parentDescriptionMeta;

            return (
              <div style={{ padding: "0 0.2rem 0 0.2rem" }}>
                <Text fontSize="sm" fontWeight="medium">
                  {accordionKey[0].toUpperCase() +
                    accordionKey
                      .slice(1, accordionKey.length)
                      .replaceAll("_", " ")}
                  <Show when={parentDesciriptionText}>
                    <HelpTooltip content={parentDesciriptionText} />
                  </Show>
                </Text>
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
                    background="gray.3"
                    gridRow="span 1"
                    gridColumn="span 1"
                  ></Text>
                  <For each={valueKeys}>
                    {(columnName) => {
                      return (
                        <Text
                          paddingLeft="0.2rem"
                          background="gray.3"
                          gridRow="span 1"
                          gridColumn="span 1"
                          fontSize="sm"
                          textAlign="center"
                          borderLeftWidth="1px"
                          borderBottomWidth="1px"
                        >
                          {columnName}
                        </Text>
                      );
                    }}
                  </For>
                  <For each={Object.entries(accordionValue)}>
                    {([parentKey, parentValue]) => {
                      if (typeof parentValue === "object") {
                        const childDescription = parentDescription
                          ? parentDescription[
                              parentKey as keyof typeof parentDescription
                            ]
                          : parentDescription;
                        return (
                          <For each={Object.entries(parentValue)}>
                            {([key, value]) => {
                              const shortenKey = key[0] + "wd";
                              if (typeof value == "object") {
                                const innerChildDescription = childDescription
                                  ? childDescription[
                                      `__${key}` as keyof typeof childDescription
                                    ]
                                  : childDescription;
                                const innerChildDescriptionText =
                                  innerChildDescription
                                    ? innerChildDescription[
                                        `description` as keyof typeof innerChildDescription
                                      ]
                                    : innerChildDescription;
                                return (
                                  <>
                                    <Text
                                      gridRow={"span 1"}
                                      gridColumn={1}
                                      fontSize="sm"
                                      borderBottomWidth="1px"
                                      borderRightWidth="1px"
                                      paddingLeft="0.2rem"
                                    >
                                      {parentKey + " " + shortenKey}
                                      <Show when={innerChildDescription}>
                                        <HelpTooltip
                                          content={innerChildDescriptionText}
                                        />
                                      </Show>
                                    </Text>
                                    <Text
                                      gridRow={"span 1"}
                                      gridColumn={2}
                                      fontSize="sm"
                                      textAlign={"right"}
                                      borderBottomWidth="1px"
                                      borderRightWidth="1px"
                                      paddingRight="0.2rem"
                                      background={
                                        typeof value[
                                          valueKeys[0] as keyof typeof value
                                        ] === "number"
                                          ? "transparent"
                                          : "gray.3"
                                      }
                                    >
                                      {value[
                                        valueKeys[0] as keyof typeof value
                                      ] ?? ""}
                                    </Text>
                                    <Text
                                      gridRow={"span 1"}
                                      gridColumn={3}
                                      fontSize="sm"
                                      textAlign={"right"}
                                      borderBottomWidth="1px"
                                      borderRightWidth="1px"
                                      paddingRight="0.2rem"
                                      background={
                                        typeof value[
                                          valueKeys[1] as keyof typeof value
                                        ] === "number"
                                          ? "transparent"
                                          : "gray.3"
                                      }
                                    >
                                      {value[
                                        valueKeys[1] as keyof typeof value
                                      ] ?? ""}
                                    </Text>
                                    <Text
                                      gridRow={"span 1"}
                                      gridColumn={4}
                                      fontSize="sm"
                                      textAlign={"right"}
                                      borderBottomWidth="1px"
                                      paddingRight="0.2rem"
                                      background={
                                        typeof value[
                                          valueKeys[2] as keyof typeof value
                                        ] === "number"
                                          ? "transparent"
                                          : "gray.3"
                                      }
                                    >
                                      {value[
                                        valueKeys[2] as keyof typeof value
                                      ] ?? ""}
                                    </Text>
                                  </>
                                );
                              }
                            }}
                          </For>
                        );
                      }
                    }}
                  </For>
                </div>
              </div>
            );
          }
        }}
      </For>
    </>
  );
}
