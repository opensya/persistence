import type {
  HookContext,
  BeforeCreateHook,
  AfterCreateHook,
  BeforeUpdateHook,
  AfterUpdateHook,
  BeforeDeleteHook,
  AfterDeleteHook,
} from "./types.js";

export class HooksRegistry {
  private readonly beforeCreateHooks = new Map<string, BeforeCreateHook[]>();
  private readonly afterCreateHooks = new Map<string, AfterCreateHook[]>();
  private readonly beforeUpdateHooks = new Map<string, BeforeUpdateHook[]>();
  private readonly afterUpdateHooks = new Map<string, AfterUpdateHook[]>();
  private readonly beforeDeleteHooks = new Map<string, BeforeDeleteHook[]>();
  private readonly afterDeleteHooks = new Map<string, AfterDeleteHook[]>();

  onBeforeCreate(table: string, hook: BeforeCreateHook): void {
    this.push(this.beforeCreateHooks, table, hook);
  }
  onAfterCreate(table: string, hook: AfterCreateHook): void {
    this.push(this.afterCreateHooks, table, hook);
  }
  onBeforeUpdate(table: string, hook: BeforeUpdateHook): void {
    this.push(this.beforeUpdateHooks, table, hook);
  }
  onAfterUpdate(table: string, hook: AfterUpdateHook): void {
    this.push(this.afterUpdateHooks, table, hook);
  }
  onBeforeDelete(table: string, hook: BeforeDeleteHook): void {
    this.push(this.beforeDeleteHooks, table, hook);
  }
  onAfterDelete(table: string, hook: AfterDeleteHook): void {
    this.push(this.afterDeleteHooks, table, hook);
  }

  private push<T>(map: Map<string, T[]>, table: string, hook: T): void {
    const list = map.get(table) ?? [];
    list.push(hook);
    map.set(table, list);
  }

  async runBeforeCreate(
    table: string,
    data: Record<string, unknown>,
    ctx: HookContext,
  ): Promise<Record<string, unknown>> {
    let current = data;
    for (const hook of this.beforeCreateHooks.get(table) ?? []) {
      current = await hook(current, ctx);
    }
    return current;
  }

  async runAfterCreate(
    table: string,
    entity: Record<string, unknown>,
    ctx: HookContext,
  ): Promise<void> {
    for (const hook of this.afterCreateHooks.get(table) ?? []) {
      await hook(entity, ctx);
    }
  }

  async runBeforeUpdate(
    table: string,
    patch: Record<string, unknown>,
    ctx: HookContext,
  ): Promise<Record<string, unknown>> {
    let current = patch;
    for (const hook of this.beforeUpdateHooks.get(table) ?? []) {
      current = await hook(current, ctx);
    }
    return current;
  }

  async runAfterUpdate(
    table: string,
    entity: Record<string, unknown>,
    ctx: HookContext,
  ): Promise<void> {
    for (const hook of this.afterUpdateHooks.get(table) ?? []) {
      await hook(entity, ctx);
    }
  }

  async runBeforeDelete(
    table: string,
    where: Record<string, unknown>,
    ctx: HookContext,
  ): Promise<void> {
    for (const hook of this.beforeDeleteHooks.get(table) ?? []) {
      await hook(where, ctx);
    }
  }

  async runAfterDelete(table: string, ctx: HookContext): Promise<void> {
    for (const hook of this.afterDeleteHooks.get(table) ?? []) {
      await hook(ctx);
    }
  }
}

export function createHooksRegistry(): HooksRegistry {
  return new HooksRegistry();
}
