import { IconFileDownload } from "@tabler/icons-solidjs";
import { IconButton } from "~/components/ui/icon-button";
import { DrivercomCommandButton } from "./DrivercomCommandButton";

export function GetFromPortButton(props: {
  onGetFromPort: (portId: string) => void;
}) {
  return (
    <DrivercomCommandButton
      tooltipContent={"Get from port"}
      onRunCommand={(port) => props.onGetFromPort(port)}
    >
      <IconButton size="xs" variant={"plain"}>
        <IconFileDownload />
      </IconButton>
    </DrivercomCommandButton>
  );
}
