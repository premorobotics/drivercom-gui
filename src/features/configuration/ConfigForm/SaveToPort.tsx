import { IconSettingsShare } from "@tabler/icons-solidjs";
import { IconButton } from "~/components/ui/icon-button";

export function SaveToPort(props: { onSaveToPort: () => void }) {
  return (
    <IconButton onClick={props.onSaveToPort} variant={"plain"} size="xs">
      <IconSettingsShare />
    </IconButton>
  );
}
