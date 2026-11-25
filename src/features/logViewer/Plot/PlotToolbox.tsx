import { IconZoomReset } from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { Tooltip } from "~/components/ui/tooltip";
import { CursorMode } from "./CursorMode/CreateCursorMode";
import { CursorModeToggleGroup } from "./CursorMode/CursorModeToggleGroup";

type PlotToolboxProps = {
  id: string;
  isZoomReset: boolean;
  onZoomReset: () => void;
  cursorMode: CursorMode;
  baseCursorMode: CursorMode;
  onCursorModeChange: (cursorMode: CursorMode) => void;
};

export function PlotToolbox(props: PlotToolboxProps) {
  return (
    <Stack
      direction="row-reverse"
      style={{
        height: "2.3rem",
        width: "100%",
        "padding-right": "1.8rem",
      }}
    >
      <Stack direction="row" id={`toolBox:${props.id}`} minWidth="13rem">
        <Tooltip content="Zoom Reset">
          <IconButton
            marginRight="0.2rem"
            variant="outline"
            disabled={props.isZoomReset}
            onclick={() => props.onZoomReset()}
          >
            <IconZoomReset />
          </IconButton>
        </Tooltip>
        <CursorModeToggleGroup
          lastCursorMode={props.baseCursorMode}
          cursorMode={props.cursorMode}
          onCursorModeChange={props.onCursorModeChange}
        />
      </Stack>
    </Stack>
  );
}
