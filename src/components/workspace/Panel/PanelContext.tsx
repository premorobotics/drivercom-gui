import { createContext } from "solid-js";
import { TabLocation } from "../types";

export type PanelProps = {
  id: string;
  key: string;
  onDeletePanel?: () => void;
  onCreatePanel?: (tabLocation: TabLocation, newPanelKey: string) => void;
};

export const PanelLayoutContext = createContext<PanelProps>();
