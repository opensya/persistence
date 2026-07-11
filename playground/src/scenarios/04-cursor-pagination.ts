import assert from "node:assert/strict";
import { runScenario } from "./helpers.js";

export async function cursorPaginationScenario(): Promise<void> {
  await runScenario("stable cursor pagination", async ({ engine }) => {
    const user = await engine.create("users", {
      email: "pagination@example.com",
      secret: "secret",
    });
    const dates = [
      "2026-07-01T10:00:00Z",
      "2026-07-02T10:00:00Z",
      "2026-07-02T10:00:00Z",
      "2026-07-03T10:00:00Z",
      "2026-07-04T10:00:00Z",
    ];

    for (const [index, date] of dates.entries()) {
      await engine.create("posts", {
        authorId: user.id,
        title: `Post ${index + 1}`,
        publishedAt: new Date(date),
      });
    }

    const first = await engine.findPage("posts", {
      first: 2,
      where: {
        conditions: [{ field: "authorId", operator: "eq", value: user.id }],
      },
      orderBy: [{ field: "publishedAt", direction: "desc" }],
    });
    assert.equal(first.data.length, 2);
    assert.equal(first.pageInfo.hasNextPage, true);
    assert.ok(first.pageInfo.endCursor);

    const second = await engine.findPage("posts", {
      first: 2,
      after: first.pageInfo.endCursor,
      where: {
        conditions: [{ field: "authorId", operator: "eq", value: user.id }],
      },
      orderBy: [{ field: "publishedAt", direction: "desc" }],
    });
    assert.equal(second.data.length, 2);
    assert.equal(
      first.data.some((firstPost) =>
        second.data.some((secondPost) => secondPost.id === firstPost.id),
      ),
      false,
    );
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await cursorPaginationScenario();
}
