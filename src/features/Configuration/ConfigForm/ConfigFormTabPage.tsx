import { AccordionStates } from "./ConfigForm";
import { LinkStates } from "./ConfigForm";
import { GainLockStates } from "./ConfigForm";
import { JSX, onMount, createEffect, on } from "solid-js";
import { createStore } from "solid-js/store";
import { ConfigFormatObject } from "./ConfigFormatObject";

export type ConfigFormTabPageProps = {
  id: string;
  format: object;
  config: object;
  focusFieldKey?: string;
  originalFile?: object;
  description?: object;
  unitChange?: boolean;
  accordionStatuses?: AccordionStates;
  linkKey?: string;
  linkedStatuses?: LinkStates;
  gainLockStatuses?: GainLockStates;
  formOverflowY: Map<string, number>;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const ConfigFormTabPage = (props: ConfigFormTabPageProps) => {
  const [store] = createStore(props.config);
  let ref: HTMLDivElement | undefined;

  onMount(() => {
    if (ref) {
      const getScrollTop = props.formOverflowY.get(props.id);
      if (getScrollTop) {
        setTimeout(() => {
          ref.scrollTo(0, getScrollTop);
        });
      }
    }
  });

  createEffect(
    on(
      () => props.focusFieldKey,
      () => {
        if (ref) {
          if (props.focusFieldKey) {
            const element = document.getElementById(
              props.id + "." + props.focusFieldKey,
            );
            if (element) {
              setTimeout(() => {
                element.scrollIntoView();
              });
            }
          }
        }
      },
    ),
  );

  return (
    <div
      id={props.id}
      ref={ref}
      style={{
        width: `100%`,
        height: "100%",
        "overflow-y": "auto",
        "overflow-x": "hidden",
        "border-width": "0",
        padding: "0.5rem",
        display: "flex",
        "flex-direction": "column",
        "justify-content": "space-between",
      }}
      onScroll={(e) => {
        props.formOverflowY.set(props.id, e.target.scrollTop);
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          "flex-direction": "column",
          gap: "0.2rem",
        }}
      >
        <ConfigFormatObject
          id={props.id}
          format={props.format}
          config={store}
          originalFile={props.originalFile}
          description={props.description}
          changeUnit={props.unitChange}
          accordionStatuses={props.accordionStatuses}
          linkKey={props.linkKey}
          linkedStatuses={props.linkedStatuses}
          gainLockStatuses={props.gainLockStatuses}
          focusFieldKey={props.focusFieldKey}
        />
      </div>
    </div>
  );
};
