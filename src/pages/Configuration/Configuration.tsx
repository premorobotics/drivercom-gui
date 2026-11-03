import {
  Pages,
  pageKeys,
  tabStore,
  panelStore,
  recentConfigFilePaths,
} from "~/store/GlobalState.ts";
import { Panel } from "~/components/Panel/Panel.tsx";
import {
  PanelLayout,
  PanelSizeContext,
} from "~/components/Panel/PanelLayout.tsx";
import { TabList, TabListContext } from "~/components/Tab/TabList.tsx";
import { ConfigTabContent } from "./ConfigTabContent.tsx";
import { createEffect, createSignal, on, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { load } from "@tauri-apps/plugin-store";
import { createNewTab, generateNewConfigTab } from "~/services/TabFactory.ts";

function Configuration() {
  const [render, setRender] = createSignal<boolean>(false);

  onMount(() => {
    // Add a configuration tab first if no tabs exist.
    if (!pageKeys.has(Pages.Configuration)) {
      const newPanelKey = crypto.randomUUID();
      pageKeys.set(Pages.Configuration, newPanelKey);

      const panelStoreKey = crypto.randomUUID();
      panelStore.set(
        newPanelKey,
        createSignal<PanelSizeContext[]>([{ id: panelStoreKey, size: 100 }]),
      );
      tabStore.set(
        panelStoreKey,
        createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
      );
      createNewConfigTab(panelStoreKey);
    }
    setRender(true);
  });

  const createNewConfigTab = (key: string) => {
    setRender(false);
    const newConfigTab = generateNewConfigTab();
    createNewTab(key, newConfigTab);
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
      () => recentConfigFilePaths(),
      async () => {
        const store = await load("store.json", {
          defaults: {
            configFilePath: undefined,
            logFilePath: undefined,
            ipHistory: undefined,
          },
          autoSave: false,
        });
        store.set("configFilePath", recentConfigFilePaths());
      },
      { defer: true },
    ),
  );

  return (
    <>
      <Show when={render()}>
        <PanelLayout id={Pages.Configuration}>
          <Panel>
            <TabList
              onCreateTab={(tabStoreKey) => {
                createNewConfigTab(tabStoreKey);
              }}
            >
              <ConfigTabContent />
            </TabList>
          </Panel>
        </PanelLayout>
      </Show>
    </>
  );
}

export default Configuration;
