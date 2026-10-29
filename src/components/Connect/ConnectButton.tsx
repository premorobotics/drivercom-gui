import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconX } from "@tabler/icons-solidjs";
import * as Popover from "~/components/ui/popover.tsx";
import { createSignal, Show } from "solid-js";
import { portList, setPortList } from "../../store/GlobalState.ts";
//@ts-ignore Implicitly has an 'any' type.
import { Stack } from "styled-system/jsx/stack.mjs";
import { Text } from "../../components/ui/text.tsx";
import { Command } from "@tauri-apps/plugin-shell";
import { For } from "solid-js";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import { Button } from "~/components/ui/button.tsx";
import { csvFileDownloads } from "../../store/GlobalState.ts";
import { DownloadStatus } from "~/components/DownloadList.tsx";
import { toaster } from "~/components/ui/toast.tsx";
import type { ComponentProps } from "solid-js";
import { css } from "styled-system/css/css";

export type ConnectButtonProps = {
  portId: string;
  onPortIdChange?: (portId: string) => void;
  buttonProps?: ComponentProps<typeof IconButton>;
};

export function ConnectButton(props: ConnectButtonProps) {
  const [isDetecting, setIsDetecting] = createSignal<boolean>(false);

  async function detectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", ["port.detect"]);
    const output = await drivercom.execute();

    const portNames = output.stdout
      .split("\n")
      .map((portName) => {
        const matched = portName.match(/\(([^)]+)\)/);
        return matched;
      })
      .filter((e) => e !== null)
      .map((e) => e[1]);
    const ports = await Promise.all(
      portNames.map(async (id) => {
        const version = await detectFirmwareVersion(id);
        if (version !== null) {
          return {
            id: id,
            version: version,
          };
        } else {
          return {
            id: id,
            version: "",
          };
        }
      }),
    );
    setPortList(ports);

    if (portNames.length == 0) {
      toaster.create({
        title: "No Ports Found",
        description: "No driver serial ports were detected.",
        type: "error",
      });
      return;
    }
    props.onPortIdChange?.("");
  }

  async function detectFirmwareVersion(portId: string): Promise<string | null> {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "--port",
      portId,
      "firmware",
    ]);
    const output = await drivercom.execute();
    const splits = output.stdout.split(":");
    if (splits.length < 2) return null;

    const version_string = splits[1].trimStart().trimEnd();
    return version_string;
  }

  return (
    <Popover.Root positioning={{ placement: "bottom-start" }}>
      <Popover.Trigger maxWidth="min-content" gap="" padding="0" {...props}>
        <Tooltip
          disabled={props.portId.length <= 0}
          content={<Show when={props.portId.length > 0}>{props.portId}</Show>}
        >
          <Button
            size="2xs"
            variant={props.portId.length > 0 ? "outline" : "solid"}
            padding="0 0.4rem 0 0.4rem"
          >
            {props.portId.length > 0 ? "Disconnect port" : "Connect port"}
          </Button>
        </Tooltip>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          padding="0.5rem"
          width="100%"
          maxHeight="11em"
          minWidth="16em"
          maxWidth="20em"
        >
          <Stack
            display="grid"
            gridTemplateColumns={`minmax(0,1fr) 2.5rem `}
            width="100%"
            gap="0"
            alignItems="center"
          >
            <Text
              fontWeight="medium"
              textStyle="xs"
              textAlign="left"
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace=""
            >
              Driver Ports
            </Text>

            <Button
              size="2xs"
              variant="outline"
              fontWeight="medium"
              loading={isDetecting()}
              onClick={async () => {
                setIsDetecting(true);
                await detectPort();
                props.onPortIdChange?.("");
                setIsDetecting(false);
              }}
              disabled={
                csvFileDownloads.findIndex(
                  (file) => file.status === DownloadStatus.Progressing,
                ) !== -1
              }
            >
              Scan
            </Button>
          </Stack>
          <Show when={portList().length > 0}>
            <div
              style={{
                width: "100%",
                height: `100%`,
                "overflow-y": "auto",
                "border-bottom-width": "1px",
                "border-top-width": "1px",
                "margin-top": "0.5em",
              }}
            >
              <For each={portList()}>
                {(port) => (
                  <Button
                    class={css({
                      width: "100%",
                      fontWeight: "normal",
                      gap: "0",
                      padding: "0",
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) 3rem 2rem",
                      justifyContent: "left",
                      flexDirection: "row",
                    })}
                    variant="plain"
                    size="xs"
                    onClick={() => {
                      props.onPortIdChange?.(port.id);
                    }}
                  >
                    <Tooltip content={port.id}>
                      <Text
                        style={{
                          width: "fit-content",
                          "text-align": "left",
                          "text-overflow": "ellipsis",
                          overflow: "hidden",
                          "white-space": "nowrap",
                          "padding-left": "0.5rem",
                        }}
                        fontSize="xs"
                      >
                        {port.id}
                      </Text>
                    </Tooltip>

                    <Tooltip content={port.version}>
                      <Text
                        style={{
                          width: "100%",
                          "text-align": "left",
                          "text-overflow": "ellipsis",
                          overflow: "hidden",
                          "white-space": "nowrap",
                          opacity: "0.5",
                        }}
                        fontSize="xs"
                      >
                        {port.version}
                      </Text>
                    </Tooltip>
                    <Show when={port.id === props.portId}>
                      <IconButton
                        size="2xs"
                        width="100%"
                        borderRadius="3rem"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onPortIdChange?.("");
                        }}
                        variant="plain"
                        margin="0"
                        padding="0"
                      >
                        <IconX />
                      </IconButton>
                    </Show>
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
