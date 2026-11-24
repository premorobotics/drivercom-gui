import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [solid(), tsconfigPaths()],
  resolve: { conditions: ["development", "browser"] },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"] },
});
