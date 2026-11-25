import { PanelSizeContext } from "~/components/workspace/types";
import { TabListContext } from "~/components/workspace/Tab/TabTypes";
import { Store, SetStoreFunction } from "solid-js/store";
import { Accessor, Setter } from "solid-js";

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
