import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/metadata/index.ts",
    "./src/adapter/index.ts",
    "./src/hooks/index.ts",
    "./src/relations/index.ts",
    "./src/sync/index.ts",
    "./src/query-engine/index.ts",
    "./src/audit/index.ts",
    "./src/events/index.ts",
    "./src/migrations/index.ts",
  ],

  tsconfig: "./tsconfig.json",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  unbundle: true,

  // Makes OPENSYA_DATABASE_VERSION (src/index.ts) track package.json
  // automatically, so the two can never drift apart again.
  env: {
    OPENSYA_PERSISTENCE_VERSION: pkg.version,
  },

  outExtensions: (ctx) => {
    return {
      js: ctx.format === "cjs" ? ".cjs" : ".js",
    };
  },
});
