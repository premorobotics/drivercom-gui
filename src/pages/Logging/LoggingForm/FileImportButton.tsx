import { Text } from "~/components/ui/text.tsx";
import { recentLogFilePaths } from "~/store/GlobalState.ts";
import { For, Show } from "solid-js";
import { IconChevronRight, IconFileImport } from "@tabler/icons-solidjs";
import * as Menu from "~/components/ui/menu.tsx";
import { Portal } from "solid-js/web";
import { Button } from "~/components/ui/button";

type FileImportButtonProps = {
  tabId: string;
  onOpenFile?: () => void;
  onOpenRecentFile?: (path: string) => void;
};

export function FileImportButton(props: FileImportButtonProps) {
  return (
    <Menu.Root>
      <Menu.Trigger>
        <Button size="xs" variant="plain">
          <IconFileImport />
          {"Open file"}
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content>
          <Menu.Item
            value={`${props.tabId}.openFile`}
            onClick={async () => {
              props.onOpenFile?.();
            }}
          >
            {"Open File..."}
          </Menu.Item>
          <Show when={recentLogFilePaths().length >= 1}>
            <Menu.Root positioning={{ placement: "right-end" }}>
              <Menu.TriggerItem>
                <Text width={`calc(100% - 0.5rem)`}>
                  {"Open Recent Files..."}
                </Text>
                <IconChevronRight />
              </Menu.TriggerItem>
              <Show when={recentLogFilePaths().length >= 1}>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      <For each={recentLogFilePaths()}>
                        {(filePath) => {
                          if (filePath.length < 1) return;
                          const parseFilePath = filePath
                            .replaceAll("\\", "/")
                            .split("/");
                          const fileName = parseFilePath.pop();
                          const restFilePath = parseFilePath
                            .slice(0 - 1)
                            .join("/");
                          return (
                            <Menu.Item
                              value={filePath}
                              onClick={async () =>
                                props.onOpenRecentFile?.(filePath)
                              }
                            >
                              <div>
                                <Text>{fileName}</Text>
                                <Text textStyle="xs" fontWeight="light">
                                  {restFilePath}
                                </Text>
                              </div>
                            </Menu.Item>
                          );
                        }}
                      </For>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Show>
            </Menu.Root>
          </Show>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
