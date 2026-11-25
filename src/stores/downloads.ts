import { createStore } from "solid-js/store";

export enum DownloadStatus {
  Progressing,
  Cancel,
  Success,
  Error,
}

export type DownloadStates = {
  filePath: string;
  status: DownloadStatus;
  port: string;
  pid: number;
  downloadProgress: number;
};

export const [csvFileDownloads, setCsvFileDownloads] = createStore<
  DownloadStates[]
>([]);
