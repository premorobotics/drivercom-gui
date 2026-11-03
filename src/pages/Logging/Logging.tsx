import {
  Pages,
  pageKeys,
  panelStore,
  tabStore,
  recentLogFilePaths,
} from "~/store/GlobalState.ts";
import { createEffect, createSignal, on, Show } from "solid-js";
import { onMount } from "solid-js";

import {
  PanelLayout,
  PanelSizeContext,
} from "~/components/Panel/PanelLayout.tsx";
import { createStore } from "solid-js/store";
import { TabList, TabListContext } from "~/components/Tab/TabList.tsx";
import { Panel } from "~/components/Panel/Panel.tsx";
import { LoggingTabContent } from "./LoggingTabContent.tsx";
import { load } from "@tauri-apps/plugin-store";
import { LogConfigType } from "src-tauri/generated/config/LogConfigType.tsx";
import { AccordionStates } from "../Configuration/ConfigForm/ConfigForm.tsx";
import { createNewTab, generateNewLoggingTab } from "~/services/TabFactory.ts";

export type LoggingFormType = {
  title: string;
  filePath: string;
  portId: string;
  logConfig: LogConfigType;
  accordionStates: AccordionStates;
  originalFile: object;
};

export type LoggingPageTabContentType = LoggingFormType;

export function Logging() {
  const [render, setRender] = createSignal<boolean>(false);

  // Add a logging tab first if no tabs exist.
  onMount(async () => {
    if (!pageKeys.has(Pages.Logging)) {
      const panelKey = crypto.randomUUID();
      pageKeys.set(Pages.Logging, panelKey);

      const panelStoreKey = crypto.randomUUID();
      panelStore.set(
        panelKey,
        createSignal<PanelSizeContext[]>([{ id: panelStoreKey, size: 100 }]),
      );
      tabStore.set(
        panelStoreKey,
        createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
      );
      createLoggingTab(panelStoreKey);
    }
    setRender(true);
  });

  const createLoggingTab = (key: string) => {
    const newLoggingTab = generateNewLoggingTab();
    createNewTab(key, newLoggingTab);
    setRender(true);
  };

  // This effect runs  whenever recent config file path list is updated,
  // and save it directly to disk via the Tauri Store API().
  // We can't rely onCleanup for this, since cleanup callbacks aren't
  // guaranteed to run if the window is closed abruptly.
  // That's why we save on every update inside the effect body itself,
  // instead of deferring it to cleanup.
  createEffect(
    on(
      () => recentLogFilePaths(),
      async () => {
        const store = await load("store.json", {
          defaults: {
            configFilePath: undefined,
            logFilePath: undefined,
            ipHistory: undefined,
          },
          autoSave: false,
        });
        store.set("logFilePath", recentLogFilePaths());
      },
      { defer: true },
    ),
  );

  return (
    <Show when={render()}>
      <PanelLayout id={Pages.Logging}>
        <Panel>
          <TabList onCreateTab={(key) => createLoggingTab(key)}>
            <LoggingTabContent />
          </TabList>
        </Panel>
      </PanelLayout>
    </Show>
  );
}

export default Logging;
