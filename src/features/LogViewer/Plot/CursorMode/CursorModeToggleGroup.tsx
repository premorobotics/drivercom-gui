import * as ToggleGroup from "~/components/ui/toggle-group";
import {
  IconArrowsMove,
  IconArrowsMoveHorizontal,
  IconArrowsMoveVertical,
  IconCrosshair,
} from "@tabler/icons-solidjs";
import { Tooltip } from "~/components/ui/tooltip";
import { CursorMode } from "./CreateCursorMode";
import { For, JSX } from "solid-js";

type CursorModeToggleGroupProps = {
  cursorMode: CursorMode;
  onCursorModeChange?: (cursorMode: CursorMode) => void;
  lastCursorMode: CursorMode;
};

export function CursorModeToggleGroup(props: CursorModeToggleGroupProps) {
  const toggleGroupButtonMeta: {
    desc: string;
    cursorMode: CursorMode;
    icon: JSX.Element;
  }[] = [
    {
      desc: "Plot Panning",
      cursorMode: CursorMode.Pan,
      icon: <IconArrowsMove />,
    },
    {
      desc: "Horizontal Zoom",
      cursorMode: CursorMode.Horizontal,
      icon: <IconArrowsMoveHorizontal />,
    },
    {
      desc: "Vertical Zoom",
      cursorMode: CursorMode.Vertical,
      icon: <IconArrowsMoveVertical />,
    },
    {
      desc: "Cursor Lock",
      cursorMode: CursorMode.Lock,
      icon: <IconCrosshair />,
    },
  ];

  return (
    <ToggleGroup.Root
      value={[CursorMode[props.lastCursorMode]]}
      onValueChange={(details) => {
        if (details.value.length > 0) {
          props.onCursorModeChange?.(
            CursorMode[details.value[0] as keyof typeof CursorMode],
          );
        } else {
          props.onCursorModeChange?.(CursorMode.None);
        }
      }}
    >
      <For each={toggleGroupButtonMeta}>
        {(toggleButtonProps, index) => {
          return (
            <Tooltip content={toggleButtonProps.desc}>
              <ToggleGroup.Item
                value={CursorMode[toggleButtonProps.cursorMode]}
                color={
                  props.cursorMode === toggleButtonProps.cursorMode
                    ? "fg.default"
                    : "fg.muted"
                }
                bgColor={
                  props.cursorMode === toggleButtonProps.cursorMode
                    ? "gray.3"
                    : "gray.1"
                }
                _hover={{
                  background:
                    props.cursorMode === toggleButtonProps.cursorMode
                      ? "gray.3"
                      : "gray.2",
                }}
                padding="0.4rem"
                borderWidth={
                  index() === toggleGroupButtonMeta.length - 1
                    ? "1px"
                    : "1px 0px 1px 1px"
                }
                borderRadius={
                  index() === 0
                    ? "0.3rem 0 0 0.3rem"
                    : index() === toggleGroupButtonMeta.length - 1
                      ? "0 0.3rem 0.3rem 0"
                      : "0rem"
                }
              >
                {toggleButtonProps.icon}
              </ToggleGroup.Item>
            </Tooltip>
          );
        }}
      </For>
    </ToggleGroup.Root>
  );
}
