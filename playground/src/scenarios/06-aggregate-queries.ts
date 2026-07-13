import assert from "node:assert/strict";
import { runScenario } from "./helpers.js";

export async function aggregateQueriesScenario(): Promise<void> {
  await runScenario("aggregate queries", async ({ engine }) => {
    const firstAuthor = await engine.create("users", {
      email: "aggregate-one@example.com",
      secret: "secret",
    });
    const secondAuthor = await engine.create("users", {
      email: "aggregate-two@example.com",
      secret: "secret",
    });

    await engine.create("posts", {
      authorId: firstAuthor.id,
      title: "First",
      publishedAt: new Date("2026-07-01T10:00:00Z"),
    });
    await engine.create("posts", {
      authorId: firstAuthor.id,
      title: "Second",
      publishedAt: new Date("2026-07-02T10:00:00Z"),
    });
    await engine.create("posts", {
      authorId: secondAuthor.id,
      title: "Third",
      publishedAt: new Date("2026-07-03T10:00:00Z"),
    });

    const grouped = await engine.aggregate("posts", {
      groupBy: ["authorId"],
      metrics: {
        postCount: { function: "count" },
        firstPublication: { function: "min", field: "publishedAt" },
        lastPublication: { function: "max", field: "publishedAt" },
      },
    });

    assert.equal(grouped.length, 2);
    const firstAuthorRow = grouped.find(
      (row) => row.authorId === firstAuthor.id,
    );
    assert.ok(firstAuthorRow);
    assert.equal(Number(firstAuthorRow.postCount), 2);
    assert.ok(firstAuthorRow.firstPublication instanceof Date);
    assert.ok(firstAuthorRow.lastPublication instanceof Date);

    const filtered = await engine.aggregate("posts", {
      where: {
        conditions: [
          { field: "authorId", operator: "eq", value: firstAuthor.id },
        ],
      },
      metrics: { postCount: { function: "count" } },
    });
    assert.equal(Number(filtered[0]?.postCount), 2);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await aggregateQueriesScenario();
}
