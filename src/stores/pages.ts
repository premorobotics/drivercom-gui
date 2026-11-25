import { createSignal } from "solid-js";

export enum Pages {
  Configuration = "configuration",
  Logging = "logging",
  LogViewer = "logViewer",
  VibrationLogger = "vibrationLogger",
  Monitoring = "monitoring",
  None = "none",
}

export const [page, setPage] = createSignal<Pages>(Pages.None);
