// Puts the vilo sidecar in src-tauri/binaries as vilo-<target triple>.
// With VILO_PATH set to a locally built vilo binary, that binary is copied.
// Otherwise the latest ViLo release for this platform is downloaded.
import process from "node:process";
import { copyFile, mkdir, readdir, rename, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Open } from "unzipper";
import { execSync } from "node:child_process";

const extension = process.platform === "win32" ? ".exe" : "";
const rustInfo = execSync("rustc -vV").toString();
const targetTriple = /host: (\S+)/.exec(rustInfo)?.[1];

if (!targetTriple) {
  console.error("Failed to determine platform target triple");
  process.exit(1);
}

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

const basePath = "src-tauri/binaries";
const target = path.join(basePath, `vilo-${targetTriple}${extension}`);

try {
  await mkdir(basePath, { recursive: true });

  if (process.env.VILO_PATH) {
    await copyFile(process.env.VILO_PATH, target);
  } else {
    execSync(
      `gh release download -R premorobotics/ViLo -p "${platform}-vilo-*.zip" --clobber`,
      { cwd: basePath, stdio: "inherit" },
    );
    for (const name of await readdir(basePath)) {
      if (name.startsWith(`${platform}-vilo-`) && name.endsWith(".zip")) {
        const zip = await Open.file(path.join(basePath, name));
        await zip.extract({ path: basePath });
        await unlink(path.join(basePath, name));
      }
    }
    await rename(path.join(basePath, `vilo${extension}`), target);
    const pdb = path.join(basePath, "vilo.pdb");
    if (existsSync(pdb)) {
      await rename(pdb, path.join(basePath, `vilo-${targetTriple}.pdb`));
    }
  }

  if (platform === "linux") {
    // Requires marking file as executable
    execSync(`chmod +x ${target}`);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
