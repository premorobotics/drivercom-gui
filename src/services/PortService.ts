import { Child, Command } from "@tauri-apps/plugin-shell";
import {
  portCommands,
  setCclinkSpeed,
  setConfigDescription,
  setConfigTabForm,
  setLogConfigDescription,
} from "~/store/GlobalState";
import { toaster } from "~/components/ui/toast.tsx";
import JSON5 from "json5";
import { ConfigType } from "src-tauri/generated/config/ConfigType";
import { LogConfigType } from "src-tauri/generated/config/LogConfigType";
import { ConfigTuneType } from "src-tauri/generated/config/ConfigTune";
import { ConfigCalibrationType } from "src-tauri/generated/config/ConfigCalibration";
import { ConfigSystemType } from "src-tauri/generated/config/ConfigSystem";

export type Port = {
  id: string;
  version: string;
};

async function sendDrivercomCommand(args: string[]): Promise<string> {
  const drivercom = Command.sidecar("binaries/drivercom", args);
  const output = await drivercom.execute();
  if (output.stderr.length > 0) {
    throw output.stderr;
  }
  return output.stdout;
}

export async function detectPort(): Promise<Port[]> {
  const drivercom = Command.sidecar("binaries/drivercom", ["port.detect"]);
  const output = await drivercom.execute();

  const portNames = output.stdout
    .split("\n")
    .map((portName) => {
      const matched = portName.match(/\(([^)]+)\)/);
      return matched;
    })
    .filter((e) => e !== null)
    .map((e) => e[1]);
  const ports = await Promise.all(
    portNames.map(async (id) => {
      const version = await detectFirmwareVersion(id);
      if (version !== null) {
        return {
          id: id,
          version: version,
        };
      } else {
        return {
          id: id,
          version: "",
        };
      }
    }),
  );

  return Promise.resolve(ports);
}

async function detectFirmwareVersion(portId: string): Promise<string | null> {
  const drivercom = Command.sidecar("binaries/drivercom", [
    "--port",
    portId,
    "firmware",
  ]);
  const output = await drivercom.execute();
  const splits = output.stdout.split(":");
  if (splits.length < 2) return null;

  const version_string = splits[1].trimStart().trimEnd();
  return version_string;
}

export const checkAvailablePort = (portId: string): boolean => {
  if (portId.length === 0) {
    return true;
  }
  if (
    Array.from(portCommands.values()).some((command) => command.port === portId)
  ) {
    toaster.create({
      title: "Communication error",
      description: "Port is already in use.",
      type: "error",
    });
    return false;
  }
  return true;
};

export async function getConfigFromPort(
  portId: string,
  version?: string,
): Promise<ConfigType> {
  const getConfig = await sendDrivercomCommand([
    `--port`,
    portId,
    `config.get`,
  ]);
  const config: ConfigType = JSON5.parse(getConfig);
  if (version) {
    const parseVersion = Number(version);
    config.state.sys_version = parseVersion;
  }
  return config;
}

export async function saveConfigToPort(
  config: object,
  portId: string,
): Promise<string> {
  const json_str = JSON5.stringify(config, { space: 2, quote: '"' });
  return await sendDrivercomCommand([
    `--port`,
    portId,
    `config.set`,
    json_str,
    `--timeout`,
    `10000`,
  ]);
}

export async function toggleServo(portId: string, servoState: boolean) {
  return await sendDrivercomCommand([
    "toggle_servo",
    "--port",
    portId,
    servoState ? "off" : "on",
  ]);
}

export async function startLogging(
  portId: string,
  filePath: string,
  logConfig: LogConfigType,
) {
  const stringifyLogConfig = JSON5.stringify(logConfig, { quote: "'" })
    .replace("current_state", `"current_state"`)
    .replace("speed_profile", `"speed_profile`)
    .replace("position_profile", `"position_profile"`);
  const args = [
    "--port",
    portId,
    "--timeout",
    "10000",
    "log.start",
    "--output",
    filePath,
    stringifyLogConfig,
  ];
  const startLogging = Command.sidecar("binaries/drivercom", args);

  // Get percentage
  startLogging.stderr.addListener("data", (line) => {
    const percentage = parseToPercentage(line);
    if (typeof percentage === "number") {
      console.log(percentage);
    }
  });

  let child: Child | null = null;
  const done = new Promise<void>((resolve, reject) => {
    startLogging.on("close", ({ code, signal }) => {
      if (code === 0) resolve();
      else
        reject(new Error(`drivercom exited (code=${code}, signal=${signal})`));
    });
    startLogging.on("error", (error) => {
      if (child) {
        child.kill().catch((e) => {
          reject(new Error(String(e)));
        });
      }
      reject(new Error(String(error)));
    });
  });

  child = await startLogging.spawn();
  return done;
}

function parseToPercentage(line: string) {
  const regex = /(\d+)\/(\d+)\s*bytes/;
  const m = line.match(regex);
  if (m) {
    const received = Number(m[1]);
    const total = Number(m[2]);
    const percentage = Math.round((received / total) * 100);
    return percentage;
  }
  return null;
}

export async function initializeSlider(
  portId: string,
  axisId: number,
  slider: number,
) {
  return await sendDrivercomCommand([
    `--port`,
    portId,
    "initialize_slider",
    axisId.toString(),
    slider.toString(),
  ]);
}

export async function getCclinkSpeenEnum() {
  const output = await sendDrivercomCommand([`config.cc_link_speed.list`]);
  const parseOutput = output.replaceAll("[", "").replaceAll("]", "").split(":");
  const cclinkSpeed = parseOutput[1]
    .split(",")
    .filter((value) => value !== "\n");
  setCclinkSpeed(cclinkSpeed);
}

export async function getConfigDescription() {
  const output = await sendDrivercomCommand([`config.info`]);
  const desc = JSON5.parse(output);
  setConfigDescription(desc);
}

export async function getLogConfigDescription() {
  const output = await sendDrivercomCommand([`log.info`]);
  const desc = JSON5.parse(output);
  setLogConfigDescription(desc);
}

async function getTuneConfig(): Promise<ConfigTuneType> {
  const output = await sendDrivercomCommand([`config.empty.tune`]);
  const tuneConfig: ConfigTuneType = JSON5.parse(output);
  return tuneConfig;
}

async function getCalibrationConfig(): Promise<ConfigCalibrationType> {
  const output = await sendDrivercomCommand([`config.empty.calibration`]);
  const calConfig: ConfigCalibrationType = JSON5.parse(output);
  return calConfig;
}

async function getSystemConfig(): Promise<ConfigSystemType> {
  const output = await sendDrivercomCommand([`config.empty.system`]);
  const systemConfig: ConfigSystemType = JSON5.parse(output);
  return systemConfig;
}

export async function prepareConfigTabFormat() {
  const tuneConfig = await getTuneConfig();
  const calConfig = await getCalibrationConfig();
  const systemConfig = await getSystemConfig();
  const config = {
    system: systemConfig,
    tune: tuneConfig,
    calibration: calConfig,
  };
  setConfigTabForm(config);
}
