import { TabContext } from "~/components/Tab/TabList";
import {
  AccordionStates,
  GainLockStates,
  LinkStates,
} from "~/pages/Configuration/ConfigForm/ConfigForm";
import { configFormFileFormat, tabStore } from "~/store/GlobalState";
import JSON5 from "json5";
import { logFormFileFormat } from "~/store/GlobalState";
import {
  ConfigType,
  State_Schema,
} from "src-tauri/generated/config/ConfigType";
import { LogConfigType } from "src-tauri/generated/config/LogConfigType";

export function addNewTab(key: string, newTab: TabContext) {
  if (tabStore.has(key)) {
    const tabCtx = tabStore.get(key)!;
    tabCtx[1]("tabContext", tabCtx[0].tabContext.length, newTab);
    setTimeout(() => {
      tabCtx[1]("focusedTab", newTab.tab.id);
    });
  }
}

export function generateNewLoggingTab(
  filePath?: string,
  newLogConfigFormat?: LogConfigType,
) {
  const id = crypto.randomUUID();
  const accordionStates: AccordionStates = new Map();
  const newTab: TabContext = {
    tab: {
      id: id,
      tabName: filePath
        ? filePath
            .replaceAll("\\", "/")
            .match(/[^?!//]+$/!)!
            .toString()
            .split(".")
            .slice(0, -1)
            .join(".")
        : "New File",
    },
    tabPage: {
      loggingTabPage: {
        title: "No port",
        portId: "",
        logConfig: JSON5.parse(
          JSON5.stringify(newLogConfigFormat ?? logFormFileFormat()),
        ),
        originalFile: JSON5.parse(
          JSON5.stringify(newLogConfigFormat ?? logFormFileFormat()),
        ),
        filePath: filePath ?? "",
        accordionStates: accordionStates,
        driverStatus: State_Schema.parse({}),
        showDriverStatus: true,
        showLogStartSetting: true,
      },
      configTabPage: null,
      logViewerTabPage: null,
    },
  };
  return newTab;
}

export function generateNewLogViewerTab(filePath: string) {
  const id = crypto.randomUUID();
  const newTab: TabContext = {
    tab: {
      id: id,
      tabName: filePath
        .replaceAll("\\", "/")
        .match(/[^?!//]+$/!)!
        .toString()
        .slice(0, -4) as string,
    },
    tabPage: {
      logViewerTabPage: {
        filePath: filePath.replaceAll("\\", "/"),
        plotSplitIndex: [],
        plotContext: [],
        plotXScale: [0, 0],
      },
      configTabPage: null,
      loggingTabPage: null,
    },
  };
  return newTab;
}

export function generateNewConfigTab(
  filePath?: string,
  configFormat?: ConfigType,
) {
  const id = crypto.randomUUID();
  const accordionStatuses: AccordionStates = new Map();
  const linkedStatuses: LinkStates = new Map();
  const gainLockStatuses: GainLockStates = new Map();
  const formOverflowY: Map<string, number> = new Map();
  const newForm = JSON5.parse(
    JSON5.stringify(configFormat ?? configFormFileFormat()),
  ) as ConfigType;
  const newTab = {
    tab: {
      id: id,
      tabName: filePath
        ? filePath
            .replaceAll("\\", "/")
            .match(/[^?!//]+$/!)!
            .toString()
            .split(".")
            .slice(0, -1)
            .join(".")
        : "New File",
    },
    tabPage: {
      configTabPage: {
        filePath: filePath ?? "",
        portId: "",
        configForm: newForm,
        configAccordionStatuses: accordionStatuses,
        configLinkedStatuses: linkedStatuses,
        configGainLockStatuses: gainLockStatuses,
        originalFile: JSON5.parse(
          JSON5.stringify(configFormat ?? configFormFileFormat()),
        ) as ConfigType,
        formOverflowY: formOverflowY,
        focusedTab: `system`,
        showTreeView: true,
        treeViewExpandedValue: [] as string[],
        showDriverStatus: true,
      },
    },
  } as TabContext;
  return newTab;
}
