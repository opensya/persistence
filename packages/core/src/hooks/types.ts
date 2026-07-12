import type { DatabaseAdapter, QueryFilter } from "../adapter/types.js";
import type { TableMetadata } from "../metadata/types.js";

export type MutationOperation = "create" | "update" | "delete";

export interface HookContext {
  table: string;
  operation: MutationOperation;
  metadata: TableMetadata;
  adapter: DatabaseAdapter;
  requestId?: string;
  tenantId?: string;
  user?: unknown;
  [key: string]: unknown;
}

export type BeforeCreateHook = (
  data: Record<string, unknown>,
  ctx: HookContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type AfterCreateHook = (
  entity: Record<string, unknown>,
  ctx: HookContext,
) => void | Promise<void>;

export type BeforeUpdateHook = BeforeCreateHook;
export type AfterUpdateHook = AfterCreateHook;

export type BeforeDeleteHook = (
  where: QueryFilter,
  ctx: HookContext,
) => void | Promise<void>;

export type AfterDeleteHook = (ctx: HookContext) => void | Promise<void>;
