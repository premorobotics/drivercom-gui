import { createSignal, For, JSX, Show } from "solid-js";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { toaster } from "~/components/ui/toast.tsx";
import * as Menu from "~/components/ui/menu";
import { detectPort, getConfigFromPort } from "~/services/PortService";
import { Port } from "~/store/GlobalState";

type PortInfo = { driverId?: number; stationId?: number } & Port;

export function DrivercomCommandButton(
  props: {
    onRunCommand?: (portId: string, version: string) => void;
    tooltipContent?: string;
  } & JSX.HTMLAttributes<HTMLDivElement>,
) {
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
        onClick={async () => {
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
          if (
            results.filter((response) => response.status === "rejected")
              .length > 0
          ) {
            toaster.create({
              title: "Port detected failed",
              description: "Fail to read driver id and stiation id.",
              type: "error",
            });
            return;
          }
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
        <Tooltip
          disabled={!props.tooltipContent}
          content={props.tooltipContent}
        >
          {props.children}
        </Tooltip>
      </Menu.Trigger>
      <Menu.Positioner>
        <Show when={ports().length && open()}>
          <Menu.Content>
            <For each={ports()}>
              {(port) => {
                return (
                  <Menu.Item
                    onClick={() => props.onRunCommand?.(port.id, port.version)}
                    value={port.id}
                    display={"flex"}
                    flexDir={"column"}
                    textAlign={"left"}
                    gap="0"
                  >
                    <Text width="100%" fontSize="sm">
                      {port.id}
                    </Text>
                    <Show when={port.stationId}>
                      <Text width="100%" fontWeight="light" textStyle="xs">
                        {`CC-Link Station ID: ${port.stationId}`}
                      </Text>
                    </Show>
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
