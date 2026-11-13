// Unpacks every sidecar that the fetch scripts downloaded into
// src-tauri/binaries and names each <binary>-<target triple>, as Tauri
// expects. A sidecar without a zip uses the binary already there, so dropping
// its fetch step lets a custom binary be used.
import process from "node:process";
import { readdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Open } from "unzipper";
import { execSync } from "node:child_process";

// Binary name and the name its release zips carry
const sidecars = [
  { binary: "drivercom", zip: "drivercom-cli" },
  { binary: "vilo", zip: "vilo" },
];

let platform;
switch (process.platform) {
  case "linux":
    platform = "linux";
    break;
  case "win32":
    platform = "windows";
    break;
  default:
    console.error("unsupported OS %s", process.platform);
    process.exit(1);
}

const rustInfo = execSync("rustc -vV").toString();
const targetTriple = /host: (\S+)/.exec(rustInfo)?.[1];
if (!targetTriple) {
  console.error("Failed to determine platform target triple");
  process.exit(1);
}

const extension = platform === "windows" ? ".exe" : "";
const basePath = "src-tauri/binaries";

try {
  const files = await readdir(basePath);
  for (const sidecar of sidecars) {
    // Only this sidecar's zips are touched, so a custom binary of another
    // sidecar stays.
    for (const name of files) {
      if (name.endsWith(".zip") && name.includes(`-${sidecar.zip}-`)) {
        if (name.startsWith(`${platform}-${sidecar.zip}-`)) {
          const zip = await Open.file(path.join(basePath, name));
          await zip.extract({ path: basePath });
        }
        await unlink(path.join(basePath, name));
      }
    }

    const binary = path.join(basePath, sidecar.binary + extension);
    const target = path.join(
      basePath,
      `${sidecar.binary}-${targetTriple}${extension}`,
    );
    // A binary already named <binary>-<target triple> is used as it is.
    if (existsSync(binary)) {
      await rename(binary, target);
    } else if (!existsSync(target)) {
      throw new Error(`No ${sidecar.binary}${extension} in ${basePath}`);
    }
    const pdb = path.join(basePath, `${sidecar.binary}.pdb`);
    if (existsSync(pdb)) {
      await rename(
        pdb,
        path.join(basePath, `${sidecar.binary}-${targetTriple}.pdb`),
      );
    }

    if (platform === "linux") {
      // Requires marking file as executable
      execSync(`chmod +x ${target}`);
    }
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
