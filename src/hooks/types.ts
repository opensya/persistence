export interface HookContext {
  table: string;
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

export type BeforeUpdateHook = (
  patch: Record<string, unknown>,
  ctx: HookContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type AfterUpdateHook = (
  entity: Record<string, unknown>,
  ctx: HookContext,
) => void | Promise<void>;

export type BeforeDeleteHook = (
  where: Record<string, unknown>,
  ctx: HookContext,
) => void | Promise<void>;

export type AfterDeleteHook = (ctx: HookContext) => void | Promise<void>;
