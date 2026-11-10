import {
  IconX,
  IconFileCheck,
  IconExclamationCircle,
  IconProgressDown,
  IconFolderCancel,
} from "@tabler/icons-solidjs";
import { IconButton } from "./ui/icon-button";
import { createEffect, createSignal, For, JSX, on, Show } from "solid-js";
import { Button } from "./ui/button";
import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text";
import {
  csvFileDownloads,
  page,
  pageKeys,
  Pages,
  panelStore,
  portCommands,
  setCsvFileDownloads,
  setPage,
  tabStore,
} from "~/store/GlobalState.ts";
import { trackStore } from "@solid-primitives/deep";
import { createStore } from "solid-js/store";
import { PanelSizeContext } from "./Panel/PanelLayout";
import { TabContext } from "./Tab/TabList";
import { TabListContext } from "./Tab/TabList";
import { css } from "styled-system/css";
import { Progress } from "@ark-ui/solid/progress";

export enum DownloadStatus {
  Progressing,
  Cancel,
  Success,
  Error,
}

export type DownloadStates = {
  filePath: string;
  status: DownloadStatus;
  port: string;
  pid: number;
  downloadProgress: number;
};

// Component for managing active downloads.
export const DownloadList = (props: JSX.HTMLAttributes<HTMLDivElement>) => {
  const [openPopover, setOpenPopover] = createSignal<boolean>(false);

  createEffect(
    on(
      () => trackStore(csvFileDownloads),
      () => {
        if (csvFileDownloads.length > 0) {
          setOpenPopover(true);
        } else {
          setOpenPopover(false);
        }
      },
      { defer: true },
    ),
  );

  const openNewTab = (newFilePath: string) => {
    if (!pageKeys.has(Pages.LogViewer)) {
      const uuid = crypto.randomUUID();
      pageKeys.set(Pages.LogViewer, uuid);
      panelStore.set(uuid, createSignal<PanelSizeContext[]>([]));
    }
    const panelKey = pageKeys.get(Pages.LogViewer);
    if (panelKey && panelStore.get(panelKey)) {
      const panelContext = panelStore.get(panelKey)!;
      if (panelContext[0]().length === 0) {
        panelContext[1]([{ id: crypto.randomUUID(), size: 100 }]);
      }
      const ctx = panelContext[0]();
      const tabListId = ctx[0].id;
      if (!tabStore.has(tabListId)) {
        tabStore.set(
          tabListId,
          createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
        );
      }
      const [tabCtx, setTabCtx] = tabStore.get(tabListId)!;
      const newTabID = crypto.randomUUID();
      const newTab: TabContext = {
        tab: {
          id: newTabID,
          tabName: newFilePath
            .replaceAll("\\", "/")
            .match(/[^?!//]+$/!)!
            .toString()
            .slice(0, -4) as string,
        },
        tabPage: {
          logViewerTabPage: {
            filePath: newFilePath,
          },
          configTabPage: null,
          loggingTabPage: null,
        },
      };
      setTimeout(() => {
        setTabCtx("tabContext", tabCtx.tabContext.length, newTab);
        setTabCtx("focusedTab", newTabID);
        if (page() !== Pages.LogViewer) {
          setPage(Pages.LogViewer);
        }
      }, 200);
    }
  };

  return (
    <Show when={openPopover()}>
      <div {...props}>
        <div
          class={css({ background: "gray.1", boxShadow: "md" })}
          style={{
            width: "16em",
            "max-height": "15em",
            height: "100%",
            "border-width": "1px",
            "border-radius": "0.5em",
          }}
        >
          <Stack
            width="100%"
            direction={"row-reverse"}
            background={"gray.3"}
            borderBottomWidth={"1px"}
            alignItems={"center"}
            borderRadius={"0.5em 0.5em 0 0"}
          >
            <IconButton
              size="xs"
              variant="plain"
              onClick={() => setOpenPopover(false)}
            >
              <IconX />
            </IconButton>
            <Text
              textStyle="xs"
              width="100%"
              paddingLeft="1em"
              fontWeight="bold"
            >
              {"Downloads"}
            </Text>
          </Stack>
          <div
            style={{
              width: "16em",
              "overflow-y": "auto",
              "max-height": "12em",
              height: "100%",
            }}
          >
            <For each={csvFileDownloads}>
              {(download, index) => {
                return (
                  <Button
                    textAlign={"left"}
                    variant="plain"
                    width="100%"
                    alignItems="center"
                    padding="0.5em 0 0.5em 0.5em"
                    height="4em"
                    gap="0"
                    onClick={() => {
                      if (download.status === DownloadStatus.Success) {
                        openNewTab(download.filePath);
                        setCsvFileDownloads(
                          csvFileDownloads.filter((_, i) => i !== index()),
                        );
                      }
                    }}
                  >
                    <Stack width="2em" marginRight={"0.5em"}>
                      <Show when={download.status === DownloadStatus.Success}>
                        <IconFileCheck />
                      </Show>
                      <Show when={download.status === DownloadStatus.Error}>
                        <IconExclamationCircle />
                      </Show>
                      <Show
                        when={download.status === DownloadStatus.Progressing}
                      >
                        <IconProgressDown />
                      </Show>
                      <Show when={download.status === DownloadStatus.Cancel}>
                        <IconFolderCancel />
                      </Show>
                    </Stack>
                    <Stack
                      gap="0"
                      width={
                        download.status === DownloadStatus.Success
                          ? `calc(100% - 5em)`
                          : `calc(100% - 7.5em)`
                      }
                    >
                      <Text
                        width="100%"
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                        }}
                        height="min-content"
                        textStyle="md"
                        fontWeight="bold"
                      >
                        {download.filePath
                          .replaceAll("\\", "/")
                          .match(/[^//]+$/)!
                          .toString()}
                      </Text>
                      <Show when={download.status === DownloadStatus.Success}>
                        <Text
                          height="min-content"
                          textStyle="sm"
                          color="fg.muted"
                          fontWeight="medium"
                          style={{
                            "white-space": "nowrap",
                            "text-overflow": "ellipsis",
                            display: "block",
                            overflow: "hidden",
                          }}
                        >
                          {download.filePath
                            .replaceAll("\\", "/")
                            .replace(
                              download.filePath.match(/[^?!//]+$/)!.toString(),
                              "",
                            )}
                        </Text>
                      </Show>
                      <Show when={download.status === DownloadStatus.Error}>
                        <Text
                          height="min-content"
                          textStyle="sm"
                          color="fg.muted"
                          fontWeight="medium"
                        >
                          {`Download failed`}
                        </Text>
                      </Show>
                      <Show when={download.status === DownloadStatus.Cancel}>
                        <Text
                          height="min-content"
                          textStyle="sm"
                          color="fg.muted"
                          fontWeight="medium"
                        >
                          {`Download canceled`}
                        </Text>
                      </Show>
                      <Show
                        when={download.status === DownloadStatus.Progressing}
                      >
                        <div
                          style={{ display: "flex", "align-items": "center" }}
                        >
                          <Text width="2.5em" textStyle="xs">
                            {`${download.downloadProgress}%`}
                          </Text>
                          <div style={{ width: `calc(100% - 3em)` }}>
                            <Progress.Root
                              value={download.downloadProgress}
                              orientation="horizontal"
                              style={{ width: `calc(100% - 2ems)` }}
                            >
                              <Progress.Track
                                class={css({
                                  background: "gray.3",
                                  borderRadius: "0.2em",
                                })}
                              >
                                <Progress.Range
                                  style={{ "border-width": "3px" }}
                                  class={css({
                                    borderColor: "fg.default",
                                    transition: "width 0.2s ",
                                    transitionTimingFunction: `cubic-bezier(1.00,0.00,0.00,1.00)`,
                                    borderRadius: "0.2em",
                                  })}
                                />
                              </Progress.Track>
                            </Progress.Root>
                          </div>
                        </div>
                      </Show>
                    </Stack>
                    <Stack width="5em" direction={"row-reverse"} gap="0">
                      <Show
                        when={download.status === DownloadStatus.Progressing}
                        fallback={
                          <IconButton
                            size="xs"
                            variant="plain"
                            width="2em"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCsvFileDownloads((prev) =>
                                prev.filter((_, i) => i !== index()),
                              );
                            }}
                          >
                            <IconX />
                          </IconButton>
                        }
                      >
                        <IconButton
                          size="xs"
                          variant="plain"
                          width="2em"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const command = portCommands.get(download.pid);
                            if (command) {
                              await command.child.kill();
                              setCsvFileDownloads(
                                index(),
                                "status",
                                DownloadStatus.Cancel,
                              );
                            }
                          }}
                        >
                          <IconX />
                        </IconButton>
                      </Show>
                    </Stack>
                  </Button>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};
