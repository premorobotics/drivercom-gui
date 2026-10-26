import { IconHelp } from "@tabler/icons-solidjs";
import { Tooltip } from "~/components/ui/tooltip";
import { IconButton } from "./ui/icon-button";
import { JSX } from "solid-js";

export function HelpTooltip(props: { content: string | JSX.Element }) {
  return (
    <Tooltip content={props.content}>
      <IconButton size="2xs" color={"fg.subtle"} variant="plain">
        <IconHelp />
      </IconButton>
    </Tooltip>
  );
}
