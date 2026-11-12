// Runs the vilo sidecar (WSDA-200-USB base station and G-Link-200 nodes) and
// parses its JSON output.
import { Child, Command } from "@tauri-apps/plugin-shell";

const sidecar = "binaries/vilo";

export type BaseStation = {
  port: string;
  name: string;
  model: string;
};

export type DiscoveredNode = {
  address: number;
  frequency: string;
  model: string;
  comm_protocol: string;
};

// Base station and node radio configuration, as `vilo base config get` and
// `vilo node config get` print it.
export type RadioConfig = {
  transmit_power: string;
  communication_protocol: string;
  frequency: string;
};

export type RadioOptions = {
  transmit_power: string[];
  communication_protocol: string[];
  frequency: string[];
};

export type LogConfig = {
  sample_rate: string;
  input_range: string;
  low_pass_filter: string;
  high_pass_filter: string;
};

export type LogOptions = {
  sample_rate: string[];
  input_range: string[];
  low_pass_filter: string[];
  high_pass_filter: string[];
};

// One sweep from `vilo log show`. The timestamp is in nanoseconds since the
// Unix epoch.
export type Sample = {
  tick: number;
  timestamp: number;
  ch1: number;
  ch2: number;
  ch3: number;
};

// A running `vilo log start` process. `endpoint` is the TCP port that the
// other `vilo log` commands talk to.
export type LogProcess = {
  child: Child;
  endpoint: number;
  exited: Promise<{ code: number | null; stderr: string }>;
};

// vilo prints `error: <name or message>` first, then a stack trace.
export function errorMessage(stderr: string, fallback: string): string {
  const line = stderr
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return line ? line.replace(/^error:\s*/, "") : fallback;
}

// `config set` exits successfully when the device rejects the configuration,
// and only logs the issue; `strict` treats a logged error as a failure.
async function run(args: string[], strict = false): Promise<string> {
  const output = await Command.sidecar(sidecar, args).execute();
  if (output.code !== 0 || (strict && /^error:/m.test(output.stderr))) {
    throw new Error(
      errorMessage(output.stderr, `vilo ${args.join(" ")} failed.`),
    );
  }
  return output.stdout;
}

// Commands that open the base station's serial port run one at a time, so
// two of them never hold the port at once.
let portQueue: Promise<unknown> = Promise.resolve();

function runOnPort(args: string[], strict = false): Promise<string> {
  const result = portQueue.then(() => run(args, strict));
  portQueue = result.catch(() => undefined);
  return result;
}

export async function listBaseStations(): Promise<BaseStation[]> {
  try {
    return JSON.parse(await runOnPort(["base", "list"]));
  } catch (e) {
    if ((e as Error).message === "NoBaseStationFound") {
      return [];
    }
    throw e;
  }
}

export async function getBaseConfig(port: string): Promise<RadioConfig> {
  return JSON.parse(await runOnPort(["base", "config", "get", "-p", port]));
}

export async function setBaseConfig(
  port: string,
  config: RadioConfig,
): Promise<void> {
  await runOnPort(
    ["base", "config", "set", "-p", port, "--json", JSON.stringify(config)],
    true,
  );
}

export async function discoverNodes(port: string): Promise<DiscoveredNode[]> {
  return JSON.parse(await runOnPort(["discover", "-p", port]));
}

// True when the node answers. vilo fails when it cannot read the node at all,
// and prints `success: false` when the ping itself is not answered.
export async function pingNode(port: string, node: number): Promise<boolean> {
  try {
    const result = JSON.parse(
      await runOnPort(["node", "ping", "-p", port, "-n", String(node)]),
    );
    return result.success === true;
  } catch {
    return false;
  }
}

export async function getNodeConfig(
  port: string,
  node: number,
): Promise<RadioConfig> {
  return JSON.parse(
    await runOnPort(["node", "config", "get", "-p", port, "-n", String(node)]),
  );
}

export async function setNodeConfig(
  port: string,
  node: number,
  config: RadioConfig,
): Promise<void> {
  await runOnPort(
    [
      "node",
      "config",
      "set",
      "-p",
      port,
      "-n",
      String(node),
      "--json",
      JSON.stringify(config),
    ],
    true,
  );
}

export async function getLogConfig(
  port: string,
  node: number,
): Promise<LogConfig> {
  return JSON.parse(
    await runOnPort(["log", "config", "get", "-p", port, "-n", String(node)]),
  );
}

export async function setLogConfig(
  port: string,
  node: number,
  config: LogConfig,
): Promise<void> {
  await runOnPort(
    [
      "log",
      "config",
      "set",
      "-p",
      port,
      "-n",
      String(node),
      "--json",
      JSON.stringify(config),
    ],
    true,
  );
}

export async function getBaseOptions(): Promise<RadioOptions> {
  return JSON.parse(await run(["base", "config", "options"]));
}

export async function getNodeOptions(): Promise<RadioOptions> {
  return JSON.parse(await run(["node", "config", "options"]));
}

export async function getLogOptions(): Promise<LogOptions> {
  return JSON.parse(await run(["log", "config", "options"]));
}

// Starts `vilo log start` and resolves once it prints its server endpoint,
// which it does after the node started sampling. Rejects if the process
// exits before that.
export function startLog(port: string, node: number): Promise<LogProcess> {
  const command = Command.sidecar(sidecar, [
    "log",
    "start",
    "-p",
    port,
    "-n",
    String(node),
  ]);
  let stdout = "";
  let stderr = "";
  let resolveExited: (v: { code: number | null; stderr: string }) => void;
  const exited = new Promise<{ code: number | null; stderr: string }>(
    (resolve) => (resolveExited = resolve),
  );

  // Serialized with the other port commands until it has started.
  const started = portQueue.then(
    () =>
      new Promise<LogProcess>((resolve, reject) => {
        let child: Child | null = null;
        let settled = false;
        const tryResolve = () => {
          const match = stdout.match(/Server endpoint: \S*:(\d+)/);
          if (!settled && child && match) {
            settled = true;
            resolve({ child, endpoint: Number(match[1]), exited });
          }
        };
        command.stdout.on("data", (line) => {
          stdout += line + "\n";
          tryResolve();
        });
        command.stderr.on("data", (line) => {
          stderr += line + "\n";
        });
        command.on("close", ({ code }) => {
          resolveExited({ code, stderr });
          if (!settled) {
            settled = true;
            reject(new Error(errorMessage(stderr, "vilo log start exited.")));
          }
        });
        command.on("error", (e) => {
          if (!settled) {
            settled = true;
            reject(new Error(e));
          }
        });
        command.spawn().then(
          (c) => {
            child = c;
            tryResolve();
          },
          (e) => {
            settled = true;
            reject(e);
          },
        );
      }),
  );
  // While the session runs, the log process holds the port; the page keeps
  // the other port commands disabled until it ends.
  portQueue = started.then(
    (log) => log.exited,
    () => undefined,
  );
  return started;
}

// New samples since the last call.
export async function showLog(endpoint: number): Promise<Sample[]> {
  const result = JSON.parse(await run(["log", "show", "-p", String(endpoint)]));
  if (!Array.isArray(result)) {
    throw new Error("The logger did not return data.");
  }
  return result;
}

// Sets the node to idle; the session keeps its data.
export async function pauseLog(endpoint: number): Promise<void> {
  await run(["log", "stop", "-p", String(endpoint)]);
}

export async function resumeLog(endpoint: number): Promise<void> {
  await run(["log", "continue", "-p", String(endpoint)]);
}

export async function saveLog(endpoint: number, path: string): Promise<void> {
  await run(["log", "save", "-p", String(endpoint), "-f", path]);
}

// Ends `vilo log start`. vilo expects Ctrl+C here: it then sets the node to
// idle and closes the base station itself.
// TODO: Send Ctrl+C. Until then, the node is set to idle with `log stop`
// and the process is killed.
export async function endLog(log: LogProcess): Promise<void> {
  try {
    await pauseLog(log.endpoint);
  } catch {
    // The process may already be gone.
  }
  await log.child.kill();
  await log.exited;
}

// Labels for the values vilo uses.

function upperWords(value: string): string {
  return value
    .split("_")
    .map((word) => word.toUpperCase())
    .join("-");
}

export function formatNodeModel(model: string): string {
  return upperWords(model).replace(/^G-LINK/, "G-Link");
}

export function formatBaseStation(base: BaseStation): string {
  return base.name.length > 0 ? base.name : upperWords(base.model);
}

export function formatFrequency(frequency: string): string {
  return frequency.replace(/^frequency_/, "");
}

export function formatOption(value: string): string {
  if (value === "lxrs") return "LXRS";
  if (value === "lxrs_plus") return "LXRS+";
  if (value.startsWith("frequency_")) return formatFrequency(value);
  let match = value.match(/^(\d+)dbm$/);
  if (match) return `${match[1]} dBm`;
  match = value.match(/^(\d+)hz$/);
  if (match) return `${match[1]} Hz`;
  match = value.match(/^(\d+)g$/);
  if (match) return `±${match[1]} g`;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
