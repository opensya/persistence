export * from "./metadata/index.js";
export * from "./adapter/index.js";
export * from "./hooks/index.js";
export * from "./relations/index.js";
export * from "./sync/index.js";
export * from "./query-engine/index.js";

export const OPENSYA_DATABASE_VERSION: string =
  process.env.OPENSYA_PERSISTENCE_VERSION ?? "0.0.0-dev";
