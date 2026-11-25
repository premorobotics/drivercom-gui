import { Accessor, createContext, Setter } from "solid-js";
import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { PanelSizeContext } from "~/components/workspace/Panel/PanelLayout.tsx";
import { TabListContext } from "~/components/workspace/Tab/TabTypes";

const [globalState, setGlobalState] = createStore({
  theme: "light",
} as GlobalState);
export { globalState, setGlobalState };

export type Theme = "light" | "dark";

export type GlobalState = {
  theme: Theme;
};

export const GlobalStateContext = createContext<{
  globalState: GlobalState;
  setGlobalState: SetStoreFunction<GlobalState>;
}>();

type PageKeys = Map<string, string>;
export const pageKeys: PageKeys = new Map();

type PanelStore = Map<
  string,
  [Accessor<PanelSizeContext[]>, Setter<PanelSizeContext[]>]
>;
export const panelStore: PanelStore = new Map();

type TabStore = Map<
  string,
  [Store<TabListContext>, SetStoreFunction<TabListContext>]
>;
export const tabStore: TabStore = new Map();
