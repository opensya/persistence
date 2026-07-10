import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],

  tsconfig: "./tsconfig.json",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  unbundle: true,

  outExtensions: (ctx) => {
    return {
      js: ctx.format === "cjs" ? ".cjs" : ".js",
    };
  },
});
