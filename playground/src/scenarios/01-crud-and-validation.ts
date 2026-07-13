import assert from "node:assert/strict";
import { UnsafeMutationError, ValidationError } from "@opensya/persistence";
import { runScenario } from "./helpers.js";

export async function crudAndValidationScenario(): Promise<void> {
  await runScenario(
    "CRUD, defaults, hooks and validation",
    async ({ engine }) => {
      const created = await engine.create(
        "users",
        {
          email: "  JOHN@EXAMPLE.COM ",
          secret: "not-returned",
        },
        { requestId: "crud-create", user: { id: "admin-1" } },
      );

      assert.match(created.id, /^[0-9a-f-]{36}$/i);
      assert.equal(created.email, "john@example.com");
      assert.ok(created.createdAt instanceof Date);
      assert.equal(created.preferences.theme, "system");
      assert.equal(created.preferences.notifications, true);
      assert.equal("secret" in created, false);

      const internalUser = await engine.internal.findOne("users", {
        where: {
          conditions: [{ field: "id", operator: "eq", value: created.id }],
        },
      });
      assert.equal(internalUser?.secret, "not-returned");

      const found = await engine.findOne("users", {
        where: {
          conditions: [{ field: "id", operator: "eq", value: created.id }],
        },
      });
      assert.equal(found?.email, "john@example.com");

      const updated = await engine.updateOne(
        "users",
        {
          conditions: [{ field: "id", operator: "eq", value: created.id }],
        },
        { email: "updated@example.com" },
      );
      assert.equal(updated?.email, "updated@example.com");

      await assert.rejects(
        engine.create("users", { email: "invalid", secret: "secret" }),
        ValidationError,
      );
      assert.throws(() => {
        engine.updateMany("users", {}, { email: "unsafe@example.com" });
      }, UnsafeMutationError);
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await crudAndValidationScenario();
}
