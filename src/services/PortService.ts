import { Command } from "@tauri-apps/plugin-shell";
import { portCommands } from "~/store/GlobalState";
import { toaster } from "~/components/ui/toast.tsx";
import JSON5 from "json5";
import { ConfigType } from "src-tauri/generated/config/ConfigType";

export type Port = {
  id: string;
  version: string;
};

async function sendDrivercomCommand(args: string[]): Promise<string> {
  try {
    const drivercom = Command.sidecar("binaries/drivercom", args);
    const output = await drivercom.execute();
    if (output.stderr.length > 0) {
      throw output.stderr;
    }
    return output.stdout;
  } catch (e) {
    throw e as string;
  }
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
  const json_str = JSON5.stringify(config, { space: 2, quote: '"' }).replaceAll(
    "'",
    '"',
  );
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
