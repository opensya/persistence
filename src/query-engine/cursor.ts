import { Buffer } from "node:buffer";
import type { QueryFilter, QueryParams } from "../adapter/types.js";
import type { TableMetadata } from "../metadata/types.js";
import { InvalidCursorError } from "./types.js";

export type CursorOrder = NonNullable<QueryParams["orderBy"]>;

interface CursorPayload {
  version: 1;
  orderBy: CursorOrder;
  values: unknown[];
}

export class CursorCodec {
  normalizeOrder(table: TableMetadata, requested?: CursorOrder): CursorOrder {
    const order = [...(requested?.length ? requested : [])];
    const fields = new Set(order.map((item) => item.field));

    for (const primaryKey of table.columns.filter((column) => column.primaryKey)) {
      if (!fields.has(primaryKey.name)) {
        order.push({ field: primaryKey.name, direction: "asc" });
      }
    }

    return order;
  }

  encode(
    orderBy: CursorOrder,
    entity: Readonly<Record<string, unknown>>,
  ): string {
    const values = orderBy.map(({ field }) => {
      const value = entity[field];
      if (value === null || value === undefined) {
        throw new InvalidCursorError(
          `Cannot create a cursor from nullable ordering field "${field}".`,
        );
      }
      return this.serializeValue(value);
    });
    const payload: CursorPayload = { version: 1, orderBy, values };
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
  }

  decode(cursor: string, expectedOrder: CursorOrder): unknown[] {
    try {
      const payload = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as Partial<CursorPayload>;

      if (
        payload.version !== 1 ||
        !Array.isArray(payload.orderBy) ||
        !Array.isArray(payload.values) ||
        payload.values.length !== expectedOrder.length ||
        !this.sameOrder(payload.orderBy, expectedOrder)
      ) {
        throw new InvalidCursorError(
          "The cursor does not match the requested ordering.",
        );
      }

      return payload.values.map((value) => this.deserializeValue(value));
    } catch (error) {
      if (error instanceof InvalidCursorError) throw error;
      throw new InvalidCursorError("The cursor is malformed.");
    }
  }

  buildAfterFilter(orderBy: CursorOrder, values: unknown[]): QueryFilter {
    return {
      or: orderBy.map((item, index) => ({
        conditions: [
          ...orderBy.slice(0, index).map((previous, previousIndex) => ({
            field: previous.field,
            operator: "eq" as const,
            value: values[previousIndex],
          })),
          {
            field: item.field,
            operator: item.direction === "asc" ? "gt" : "lt",
            value: values[index],
          },
        ],
      })),
    };
  }

  private sameOrder(left: CursorOrder, right: CursorOrder): boolean {
    return (
      left.length === right.length &&
      left.every(
        (item, index) =>
          item.field === right[index]?.field &&
          item.direction === right[index]?.direction,
      )
    );
  }

  private serializeValue(value: unknown): unknown {
    if (typeof value === "bigint") {
      return { type: "bigint", value: value.toString() };
    }
    if (value instanceof Date) {
      return { type: "date", value: value.toISOString() };
    }
    return value;
  }

  private deserializeValue(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;
    const tagged = value as { type?: unknown; value?: unknown };
    if (tagged.type === "bigint" && typeof tagged.value === "string") {
      return BigInt(tagged.value);
    }
    if (tagged.type === "date" && typeof tagged.value === "string") {
      const date = new Date(tagged.value);
      if (Number.isNaN(date.getTime())) {
        throw new InvalidCursorError("The cursor contains an invalid date.");
      }
      return date;
    }
    return value;
  }
}

export function createCursorCodec(): CursorCodec {
  return new CursorCodec();
}
