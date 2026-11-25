import {
  ConfigType,
  configDefaultValues,
} from "src-tauri/generated/config/ConfigType.tsx";
import {
  logConfigDefaultValues,
  LogConfigType,
} from "src-tauri/generated/config/LogConfigType.tsx";
import { configTuneDefaultValues } from "src-tauri/generated/config/ConfigTune.tsx";
import { configSystemDefaultValues } from "src-tauri/generated/config/ConfigSystem.tsx";
import { configCalibrationDefaultValues } from "src-tauri/generated/config/ConfigCalibration.tsx";
import { createSignal } from "solid-js";
import { ConfigTuneType } from "src-tauri/generated/config/ConfigTune.tsx";
import { ConfigSystemType } from "src-tauri/generated/config/ConfigSystem.tsx";
import { ConfigCalibrationType } from "src-tauri/generated/config/ConfigCalibration.tsx";

export type ConfigFormatType = {
  tune: ConfigTuneType;
  system: ConfigSystemType;
  calibration: ConfigCalibrationType;
};

export const [logFormFileFormat, setLogFormFileFormat] =
  createSignal<LogConfigType>(logConfigDefaultValues);
export const [configFormFileFormat, setConfigFormFileFormat] =
  createSignal<ConfigType>(configDefaultValues);

export const [configDescription, setConfigDescription] = createSignal<object>(
  {},
);
export const [logConfigDescription, setLogConfigDescription] =
  createSignal<object>({});

export const [configTabForm, setConfigTabForm] = createSignal<ConfigFormatType>(
  {
    tune: configTuneDefaultValues,
    system: configSystemDefaultValues,
    calibration: configCalibrationDefaultValues,
  },
);

export const [cclinkSpeed, setCclinkSpeed] = createSignal<string[]>([]);
