import { IconFileDownload } from "@tabler/icons-solidjs";
import { IconButton } from "~/components/ui/icon-button";

export function GetFromPortButton(props: { onGetFromPort: () => void }) {
  return (
    <IconButton size="xs" variant={"plain"} onClick={props.onGetFromPort}>
      <IconFileDownload />
    </IconButton>
  );
}
