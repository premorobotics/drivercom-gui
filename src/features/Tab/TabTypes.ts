import { LoggingPageTabContentType } from "~/pages/Logging.tsx";
import { ConfigTabPage } from "~/features/configuration/ConfigTabContent";
import { LogViewerTabPage } from "~/features/logViewer/LogViewerTabPageContent";

type ValueOf<Obj> = Obj[keyof Obj];
type OneOnly<Obj, Key extends keyof Obj> = {
  [key in Exclude<keyof Obj, Key>]: null;
} & Pick<Obj, Key>;
type OneOfByKey<Obj> = { [key in keyof Obj]: OneOnly<Obj, key> };
export type OneOfType<Obj> = ValueOf<OneOfByKey<Obj>>;

export type TabType = {
  id: string;
  tabName: string;
};

export type TabListContext = {
  focusedTab: string;
  tabContext: TabContext[];
};

export type TabPageType = OneOfType<{
  logViewerTabPage: LogViewerTabPage;
  configTabPage: ConfigTabPage;
  loggingTabPage: LoggingPageTabContentType;
}>;

export type TabContext = {
  tab: TabType;
  tabPage?: TabPageType;
};
