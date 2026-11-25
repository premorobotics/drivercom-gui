export type PanelSizeContext = {
  id: string;
  size: number;
};

export type TabLocation =
  | "none"
  | "rightSplitter"
  | "leftSplitter"
  | "otherPanel"
  | "tabList"
  | "centerSplitter";
