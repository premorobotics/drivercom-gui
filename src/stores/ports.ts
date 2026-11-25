import { createSignal } from "solid-js";
import { Child } from "@tauri-apps/plugin-shell";

export type Port = {
  id: string;
  version: string;
};

export type PortCommand = {
  port: string;
  child: Child;
};

export const [portList, setPortList] = createSignal<Port[]>([]);

export const portCommands: Map<number, PortCommand> = new Map();
