import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text.tsx";
import {
  logFormFileFormat,
  Pages,
  pageKeys,
  recentLogFilePaths,
  setRecentLogFilePaths,
  logConfigDescription,
  tabStore,
} from "~/store/GlobalState.ts";
import { createSignal, Show, useContext } from "solid-js";
import { LoggingForm } from "./LoggingForm.tsx";
import {
  IconAdjustmentsCog,
  IconDeviceFloppy,
  IconTableFilled,
} from "@tabler/icons-solidjs";
import { createEffect } from "solid-js";
import { on } from "solid-js";
import { Button } from "~/components/ui/button.tsx";
import { FileHandler } from "../../services/FileHandler.ts";
import { toaster } from "~/components/ui/toast.tsx";
import { TabPageContext } from "~/components/Tab/TabList.tsx";
import { FileImportButton } from "./LoggingForm/FileImportButton.tsx";
import { css } from "styled-system/css/css";
import { DriverStatus } from "../Configuration/ConfigForm/DriverStatus.tsx";
import { LoggingSideBar } from "./LoggingForm/LoggingSideBar.tsx";
import { startLogging } from "~/services/PortService.ts";
import { IconButton } from "~/components/ui/icon-button.tsx";

// A custom tab page component for the Logging page.
export function LoggingTabContent() {
  const loggingTabProps = useContext(TabPageContext);
  if (!loggingTabProps) return;
  if (!tabStore.get(loggingTabProps.key)) return;

  const getTabIndex = () => {
    const tabIndex = tabStore
      .get(loggingTabProps.key)![0]
      .tabContext.findIndex((tab) => tab.tab.id === loggingTabProps.tabId);
    return tabIndex;
  };

  const getLoggingConfig = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.logConfig;
  };

  const setLoggingConfig = (config: object) => {
    return tabStore.get(loggingTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "loggingTabPage",
      "logConfig",
      config,
    );
  };

  const getFilePath = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.filePath;
  };

  const setFilePath = (newFilePath: string) => {
    return tabStore.get(loggingTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "loggingTabPage",
      "filePath",
      newFilePath,
    );
  };

  const getTitle = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.title;
  };

  const setTabName = (newTabName: string) => {
    return tabStore.get(loggingTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tab",
      "tabName",
      newTabName,
    );
  };

  const getTabId = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()].tab
      .id;
  };

  const getAccordionStates = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.accordionStates;
  };

  const getDriverStatus = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.driverStatus;
  };

  const getShowLogSetting = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.showLogStartSetting;
  };

  const setShowLogSetting = (newStatus: boolean) => {
    return tabStore.get(loggingTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "loggingTabPage",
      "showLogStartSetting",
      newStatus,
    );
  };

  const getShowDriverStatus = () => {
    return tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()]
      .tabPage!.loggingTabPage!.showDriverStatus;
  };

  const setShowDriverStatus = (newStatus: boolean) => {
    return tabStore.get(loggingTabProps.key)![1](
      "tabContext",
      getTabIndex(),
      "tabPage",
      "loggingTabPage",
      "showDriverStatus",
      newStatus,
    );
  };

  // This signal is needed in UI when reload the file or port.
  const [renderLoggingForm, setRenderLoggingForm] = createSignal<boolean>(true);

  function setLogFormData(form: object, path: string) {
    setTabName(path.replaceAll("\\", "/").split("/").pop()!);
    setFilePath(path);
    setLoggingConfig(form);
  }

  createEffect(
    on(
      () =>
        tabStore.get(loggingTabProps.key)![0].tabContext[getTabIndex()].tabPage!
          .loggingTabPage!.filePath,
      () => {
        setTimeout(() => {
          refresh();
        });
      },
    ),
  );

  const refresh = () => {
    setRenderLoggingForm(false);
    setRenderLoggingForm(true);
  };

  const fileHandler = new FileHandler();

  let scrollContainer: HTMLDivElement | undefined;
  const scrollToWrongField = (scrollContainer: HTMLDivElement) => {
    const top = Array.from(
      document.querySelectorAll(`[data-name*="config_field_error"]`),
    )[0].parentElement?.offsetTop;

    if (top) {
      const one_rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      scrollContainer.scrollTo({
        top: top - scrollContainer.offsetTop - one_rem,
      });
    }
  };

  const openFileDialog = async (): Promise<string> => {
    const extension = "json5";
    const path = await fileHandler.openFileDialog(extension);
    return path;
  };

  const readLogFile = async (path: string) => {
    try {
      const file = await fileHandler.readFile(path, logFormFileFormat());
      setLogFormData(file, path);
      setRecentLogFilePaths((prev) => {
        const newRecentFiles = prev.filter(
          (prevFilePath) => prevFilePath !== path,
        );
        return [path, ...newRecentFiles];
      });
    } catch {
      toaster.create({
        title: "Invalid File ",
        description: "The file is invalid.",
        type: "error",
      });
      if (recentLogFilePaths().includes(path)) {
        setRecentLogFilePaths((prev) => {
          const newRecentFiles = prev.filter(
            (prevFilePath) => prevFilePath !== path,
          );
          return newRecentFiles;
        });
      }
    }
  };

  const saveAsFile = async () => {
    try {
      if (
        scrollContainer &&
        document.querySelectorAll(`[data-name*="config_field_error"]`).length >
          0
      ) {
        scrollToWrongField(scrollContainer);
        toaster.create({
          title: "Invalid File",
          description: "The file is invalid.",
          type: "error",
        });
        return;
      }
      const path = await fileHandler.saveFileDialog(
        "json5",
        getFilePath(),
        getTitle(),
      );
      await fileHandler.writeFile(path, getLoggingConfig());
    } catch {
      toaster.create({
        title: "Invalid File",
        description: "The file is invalid.",
        type: "error",
      });
    }
  };

  const [loadStartLogButton, setLoadStartLogButton] =
    createSignal<boolean>(false);

  return (
    <Show when={pageKeys.has(Pages.Logging) ? true : renderLoggingForm()}>
      <div
        id={pageKeys.get(Pages.Logging)}
        style={{
          height: "100%",
          width: `100% `,
          display: "grid",
          "grid-auto-rows": `2rem minmax(0,1fr)`,
          "grid-template-columns": `${getShowLogSetting() ? 15 : 0}rem minmax(0,1fr) ${getShowDriverStatus() ? 30 : 0}rem`,
        }}
      >
        <Show when={getShowLogSetting()}>
          <div
            class={css({
              borderRightWidth: "1px",
              background: "gray.2",
              gridRow: "span 2",
              gridColumn: "1",
              padding: "0.4rem",
            })}
          >
            <LoggingSideBar
              id={getTabId()}
              config={getLoggingConfig()}
              accordionStates={getAccordionStates()}
              loadStartButton={loadStartLogButton()}
              onStartLogging={async (portId) => {
                setLoadStartLogButton(true);
                try {
                  const filePath = await fileHandler.saveFileDialog("csv", "");
                  await startLogging(portId, filePath, getLoggingConfig()!);
                  setLoadStartLogButton(false);
                } catch (e) {
                  setLoadStartLogButton(false);
                  toaster.create({
                    title: "Logging Failed",
                    description: e as string,
                    type: "error",
                  });
                }
              }}
            />
          </div>
        </Show>
        <Show when={renderLoggingForm()}>
          <Stack
            width="100%"
            gap="0"
            height={"2rem"}
            outlineStyle="solid"
            outlineWidth="1px"
            outlineColor="border"
            alignItems={"center"}
            gridRow="1"
            gridColumn="2"
            background="gray.2"
            display={"grid"}
            gridTemplateColumns={"2rem minmax(0,1fr) 7rem 7rem 2rem"}
            fontSize="sm"
          >
            <IconButton
              variant="plain"
              size="xs"
              onClick={() => setShowLogSetting(!getShowLogSetting())}
              color={getShowLogSetting() ? "accent.9" : "fg.muted"}
            >
              <IconAdjustmentsCog />
            </IconButton>
            <Text fontWeight="medium">{"Log Config"}</Text>
            {/*Open file button */}
            <FileImportButton
              tabId={getTabId()}
              onOpenFile={async () => {
                try {
                  const path = await openFileDialog();
                  await readLogFile(path);
                } catch {
                  toaster.create({
                    title: "Invalid File Path",
                    description: "The file path is invalid.",
                    type: "error",
                  });
                  return;
                }
              }}
              onOpenRecentFile={async (filePath) => {
                await readLogFile(filePath);
              }}
            />

            <Button
              variant={"plain"}
              onClick={async () => await saveAsFile()}
              size="xs"
            >
              <IconDeviceFloppy />
              {"Save as file"}
            </Button>
            <IconButton
              variant="plain"
              size="xs"
              onClick={() => setShowDriverStatus(!getShowDriverStatus())}
              color={getShowDriverStatus() ? "accent.9" : "fg.muted"}
            >
              <IconTableFilled />
            </IconButton>
          </Stack>

          <div
            style={{
              width: "100%",
              height: "100%",
              "overflow-y": "auto",
              padding: "0.2rem",
              "grid-row": "2",
              "grid-column": "2",
            }}
          >
            <LoggingForm
              id={getTabId()}
              formData={getLoggingConfig().config}
              accordionStates={getAccordionStates()}
              ref={scrollContainer}
              description={logConfigDescription()}
            />
          </div>
        </Show>
        <Show when={getShowDriverStatus()}>
          <div
            style={{
              width: "100%",
              height: "100%",
              "grid-row": "span 2",
              "grid-column": 3,
            }}
          >
            <DriverStatus
              id={getTabId()}
              driverStatus={getDriverStatus()}
              accordionStatuses={getAccordionStates()!}
            />
          </div>
        </Show>
      </div>
    </Show>
  );
}
