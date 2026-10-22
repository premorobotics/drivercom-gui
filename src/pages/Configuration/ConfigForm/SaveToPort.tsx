import { IconSettingsShare } from "@tabler/icons-solidjs";
import { IconButton } from "~/components/ui/icon-button";
import { DrivercomCommandButton } from "./DrivercomCommandButton";

export function SaveToPort(props: { onSaveToPort: (portId: string) => void }) {
  return (
    <DrivercomCommandButton
      onRunCommand={(port) => props.onSaveToPort(port)}
      tooltipContent={"Save to port"}
    >
      <IconButton variant={"plain"} size="xs">
        <IconSettingsShare />
      </IconButton>
    </DrivercomCommandButton>
  );
}
