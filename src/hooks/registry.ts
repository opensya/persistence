import type { QueryFilter } from "../adapter/types.js";
import type {
  AfterCreateHook,
  AfterDeleteHook,
  AfterUpdateHook,
  BeforeCreateHook,
  BeforeDeleteHook,
  BeforeUpdateHook,
  HookContext,
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

  async runBeforeCreate(
    table: string,
    data: Record<string, unknown>,
    context: HookContext,
  ): Promise<Record<string, unknown>> {
    return this.runTransformHooks(
      this.beforeCreateHooks.get(table) ?? [],
      data,
      context,
    );
  }

  async runAfterCreate(
    table: string,
    entity: Record<string, unknown>,
    context: HookContext,
  ): Promise<void> {
    for (const hook of this.afterCreateHooks.get(table) ?? []) {
      await hook(entity, context);
    }
  }

  async runBeforeUpdate(
    table: string,
    patch: Record<string, unknown>,
    context: HookContext,
  ): Promise<Record<string, unknown>> {
    return this.runTransformHooks(
      this.beforeUpdateHooks.get(table) ?? [],
      patch,
      context,
    );
  }

  async runAfterUpdate(
    table: string,
    entity: Record<string, unknown>,
    context: HookContext,
  ): Promise<void> {
    for (const hook of this.afterUpdateHooks.get(table) ?? []) {
      await hook(entity, context);
    }
  }

  async runBeforeDelete(
    table: string,
    where: QueryFilter,
    context: HookContext,
  ): Promise<void> {
    for (const hook of this.beforeDeleteHooks.get(table) ?? []) {
      await hook(where, context);
    }
  }

  async runAfterDelete(
    table: string,
    context: HookContext,
  ): Promise<void> {
    for (const hook of this.afterDeleteHooks.get(table) ?? []) {
      await hook(context);
    }
  }

  private async runTransformHooks(
    hooks: Array<BeforeCreateHook | BeforeUpdateHook>,
    initialValue: Record<string, unknown>,
    context: HookContext,
  ): Promise<Record<string, unknown>> {
    let current = initialValue;
    for (const hook of hooks) {
      current = await hook(current, context);
    }
    return current;
  }

  private push<T>(map: Map<string, T[]>, table: string, hook: T): void {
    map.set(table, [...(map.get(table) ?? []), hook]);
  }
}

export function createHooksRegistry(): HooksRegistry {
  return new HooksRegistry();
}
