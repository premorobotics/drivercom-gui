import { For, createSignal, JSX, Show } from "solid-js";
import { FormCheckBox } from "./Form/FormCheckBox.tsx";
import { FormNumberInput } from "./Form/FormNumberInput.tsx";
import { FormCollapsibleObject } from "./Form/FormCollapsibleObject.tsx";
import { createStore } from "solid-js/store";
import { AccordionStates } from "~/pages/Configuration/ConfigForm/ConfigForm.tsx";

export type FormProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  value: object;
  oneColumn?: boolean;
  format?: object;
  description?: object;
  originalFile?: object;
  changeUnits?: boolean;
  onItemChange?: () => void;
  accordionStates: AccordionStates;
};

// A generic form component that can adapt to any object shape.
export function Form(props: FormProps) {
  const [object, setObject] = createStore(props.value);

  const [prevCheckBoxIndex, setPrevCheckBoxIndex] = createSignal<number | null>(
    null,
  );

  const checkBoxShiftClick = (
    prevIndex: number,
    nextIndex: number,
    form: object,
  ) => {
    const startNumber = prevIndex > nextIndex ? nextIndex : prevIndex + 1;
    const endNumber = prevIndex < nextIndex ? nextIndex + 1 : prevIndex;
    const values = Object.values(form);
    const parseValues = values.slice(startNumber, endNumber);
    if (parseValues.includes(values[prevIndex])) return;

    const keys = Object.keys(form).slice(startNumber, endNumber);
    keys.forEach((key) => {
      setObject(
        key as keyof typeof object,
        // @ts-ignore : TSC unable to handle generic object type
        // in store
        values[prevIndex],
      );
    });
  };

  const checkDesc = (key: string) => {
    if (!props.description) return false;
    const descKeys = Array.from(Object.keys(props.description));
    if (descKeys.includes(key)) {
      return true;
    } else return false;
  };

  const objectEntries = Object.entries(props.format ?? object).filter(
    ([, value]) => typeof value === "object",
  );
  const noneObjectEntries = Object.entries(props.format ?? object)
    .filter(([, value]) => typeof value !== "object")
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "row-gap": "0.2rem",
      }}
    >
      <Show when={noneObjectEntries.length > 0}>
        <div
          style={{
            display: "grid",
            "grid-template-columns": props.oneColumn
              ? undefined
              : `50% minmax(0,1fr) `,
            "grid-auto-rows": "1.8rem",
            "column-gap": "0.4rem",
          }}
        >
          <For each={noneObjectEntries}>
            {(entry, index) => {
              const key = entry[0];
              const format = entry[1];

              const hasDesc = checkDesc(`__${key}`);
              const description = hasDesc
                ? (props.description![
                    `__${key}` as keyof typeof props.description
                  ] as object)
                : undefined;
              if (
                description &&
                description["hidden" as keyof typeof description] === true
              ) {
                return;
              }
              if (typeof format === "boolean") {
                const label = !isNaN(Number(key))
                  ? `${props.id.split(`.`).pop()} ${Number(key) + 1}`
                  : key;
                return (
                  <div
                    style={{
                      "border-bottom-width":
                        index() >=
                        noneObjectEntries.length -
                          (noneObjectEntries.length % 2 == 0 ? 2 : 1)
                          ? "0px"
                          : "1px",
                    }}
                  >
                    <FormCheckBox
                      id={`${props.id}.${key}`}
                      label={label}
                      desc={description}
                      originalValue={
                        props.originalFile
                          ? props.originalFile[
                              key as keyof typeof props.originalFile
                            ]
                          : undefined
                      }
                      checked={object[key as keyof typeof object]}
                      onCheckedChange={(checked) =>
                        setObject(
                          key as keyof typeof object,
                          // @ts-ignore: TSC unable to handle generic object type
                          // in store
                          checked,
                        )
                      }
                      onClick={() => {
                        setPrevCheckBoxIndex(index());
                      }}
                      onShiftClick={() => {
                        if (typeof prevCheckBoxIndex() === "number") {
                          checkBoxShiftClick(
                            prevCheckBoxIndex()!,
                            index(),
                            object,
                          );
                          setPrevCheckBoxIndex(null);
                        }
                      }}
                    />
                  </div>
                );
              }
              if (typeof format === "number") {
                if (key === "_") return;
                const label = !isNaN(Number(key))
                  ? `${props.id.split(`.`).pop()} ${Number(key) + 1}`
                  : key;

                return (
                  <FormNumberInput
                    id={`${props.id}.${key}`}
                    label={label}
                    desc={description}
                    originalValue={
                      props.originalFile
                        ? props.originalFile![
                            key as keyof typeof props.originalFile
                          ]
                        : undefined
                    }
                    changeUnits={props.changeUnits}
                    inputValue={object[key as keyof typeof object]}
                    onInputChange={(value) => {
                      setObject(
                        key as keyof typeof object,
                        // @ts-ignore: TSC unable to handle generic object type
                        // in store
                        value,
                      );
                    }}
                  />
                );
              }
            }}
          </For>
        </div>
      </Show>
      <Show when={objectEntries.length > 0}>
        <For each={objectEntries}>
          {(entry) => {
            const key = entry[0];
            const format = entry[1];

            const hasDesc = checkDesc(`__${key}`);
            const description = hasDesc
              ? (props.description![
                  `__${key}` as keyof typeof props.description
                ] as object)
              : undefined;
            if (
              description &&
              description["hidden" as keyof typeof description] === true
            ) {
              return;
            }

            if (typeof format === "object") {
              if (checkDesc(key)) {
                const desc =
                  props.description![key as keyof typeof props.description];
                if (typeof desc === "object") {
                  const entry = Object.entries(desc);
                  const onlyDesc = entry.filter((entry) =>
                    entry[0].startsWith("__"),
                  );
                  if (onlyDesc.length > 0) {
                    const descValues = onlyDesc
                      .filter((desc) =>
                        Object.keys(format).includes(desc[0].replace(`__`, "")),
                      )
                      .map((desc) => desc[1]);
                    const findHidden = descValues
                      .map((desc) => {
                        if (
                          typeof desc == "object" &&
                          desc &&
                          "hidden" in desc &&
                          typeof desc.hidden === "boolean"
                        ) {
                          return desc.hidden;
                        } else {
                          return false;
                        }
                      })
                      .filter((hidden) => hidden);

                    if (
                      findHidden.length === descValues.length &&
                      findHidden.length > 0
                    ) {
                      return;
                    }
                  }
                }
              }
              return (
                <FormCollapsibleObject
                  id={props.id}
                  key={
                    isNaN(Number(key))
                      ? key
                      : `${props.id.split(".").pop()} ${Number(key) + 1}`
                  }
                  description={
                    checkDesc(key)
                      ? props.description![
                          key as keyof typeof props.description
                        ]
                      : undefined
                  }
                  originalFile={
                    props.originalFile && key in props.originalFile
                      ? props.originalFile![
                          key as keyof typeof props.originalFile
                        ]
                      : undefined
                  }
                  changeUnits={props.changeUnits}
                  triggerDescription={description}
                  format={props.format ? format : undefined}
                  value={object[key as keyof typeof object]}
                  accordionStates={props.accordionStates}
                />
              );
            }
          }}
        </For>
      </Show>
    </div>
  );
}
