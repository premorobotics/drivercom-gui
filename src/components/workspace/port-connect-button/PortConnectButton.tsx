import { createSignal, For, Show } from "solid-js";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { toaster } from "~/components/ui/toast.tsx";
import * as Menu from "~/components/ui/menu";
import { detectPort, getConfigFromPort } from "~/services/PortService";
import { Port } from "~/stores/ports";
import {
  IconPlugConnected,
  IconPlugConnectedX,
  IconX,
} from "@tabler/icons-solidjs";
import { IconButton } from "~/components/ui/icon-button";

type PortInfo = { driverId?: number; stationId?: number } & Port;

export function PortConnectButton(props: {
  isConnect: boolean;
  onPortConnected?: (portId: string, version: string) => void;
  size?: "2xs" | "xs" | "sm";
}) {
  const [ports, setPorts] = createSignal<PortInfo[]>([]);
  const [open, setOpen] = createSignal<boolean>(false);

  return (
    <Menu.Root
      open={open()}
      onFocusOutside={() => setOpen(false)}
      onInteractOutside={() => setOpen(false)}
      onOpenChange={(e) => setOpen(e.open)}
      onRequestDismiss={() => setOpen(false)}
    >
      <Menu.Trigger
        width="min-content"
        height={"min-content"}
        onClick={async (e) => {
          e.stopPropagation();
          if (open()) return;
          const detectedPorts = await detectPort();
          if (detectedPorts.length === 0) {
            toaster.create({
              title: "Invalid Port",
              description: "No port detected",
              type: "error",
            });
            return;
          }
          const results = await Promise.allSettled(
            detectedPorts.map((port) => getConfigFromPort(port.id)),
          );
          const fullFilledResults = results
            .filter((response) => response.status === "fulfilled")
            .map((response) => response.value);
          const portInfos: PortInfo[] = detectedPorts.map((port, i) => {
            return {
              ...port,
              driverId: fullFilledResults[i].id,
              stationId: fullFilledResults[i].station,
            };
          });
          setPorts(portInfos);
        }}
      >
        <Tooltip content={"Detect which port is connected to driver."}>
          <IconButton
            size={props.size ?? "xs"}
            variant={"plain"}
            color={props.isConnect ? "accent.9" : "fg.default"}
          >
            {props.isConnect ? <IconPlugConnected /> : <IconPlugConnectedX />}
          </IconButton>
        </Tooltip>
      </Menu.Trigger>
      <Menu.Positioner>
        <Show when={ports().length && open()}>
          <Menu.Content>
            <For each={ports()}>
              {(port) => {
                return (
                  <Menu.Item
                    onClick={() =>
                      props.onPortConnected?.(port.id, port.version)
                    }
                    value={port.id}
                    display={"flex"}
                    textAlign={"left"}
                    gap="0"
                    paddingRight="0"
                  >
                    <div>
                      <Text width="100%" fontSize="sm">
                        {port.id}
                      </Text>
                      <Show when={port.stationId}>
                        <Text width="100%" fontWeight="light" textStyle="xs">
                          {`CC-Link Station ID: ${port.stationId}`}
                        </Text>
                      </Show>
                    </div>
                    <IconButton
                      borderRadius="2rem"
                      size="xs"
                      variant="plain"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onPortConnected?.("", "");
                      }}
                    >
                      <IconX />
                    </IconButton>
                  </Menu.Item>
                );
              }}
            </For>
          </Menu.Content>
        </Show>
      </Menu.Positioner>
    </Menu.Root>
  );
}
