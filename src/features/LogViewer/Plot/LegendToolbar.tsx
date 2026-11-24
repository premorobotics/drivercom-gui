import { Show } from "solid-js";
import {
  IconLocation,
  IconLocationOff,
  IconSearch,
  IconX,
} from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { Tooltip } from "~/components/ui/tooltip";

type LegendToolbarProps = {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  showCheckbox: boolean;
  onShowCheckboxToggle: () => void;
};

export function LegendToolbar(props: LegendToolbarProps) {
  return (
    <Stack
      width={`calc(100% - 1rem)`}
      height={"2.5em"}
      direction="row"
      marginTop={"0.5em"}
      paddingLeft="0.8rem"
      paddingRight="1rem"
    >
      <Stack
        width="100%"
        direction="row"
        borderWidth="1px"
        borderRadius="0.4rem"
        paddingLeft="0.5em"
        height="2em"
        marginTop="0.3em"
        gap="0"
      >
        <IconSearch
          style={{
            "margin-top": "0.2em",
            "margin-right": "0.5em",
          }}
        />
        <input
          value={props.searchInput}
          onInput={(e) => {
            props.onSearchInputChange(e.target.value);
          }}
          placeholder="Search series"
          style={{
            border: "none",
            outline: "none",
            "white-space": "nowrap",
            overflow: "hidden",
            display: "block",
            "text-overflow": "ellipsis",
            width: `calc(100% - 0.5em)`,
          }}
          height="1em"
        />
        <IconButton
          variant="plain"
          onClick={() => props.onSearchInputChange("")}
          padding="0"
          size="sm"
          width="1em"
          height="1.5em"
          borderRadius="3em"
          marginTop="0.2em"
        >
          <IconX />
        </IconButton>
      </Stack>
      <Tooltip content="Select">
        <IconButton
          variant="outline"
          size="xs"
          onClick={() => props.onShowCheckboxToggle()}
        >
          <Show when={props.showCheckbox} fallback={<IconLocationOff />}>
            <IconLocation />
          </Show>
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
