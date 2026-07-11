import assert from "node:assert/strict";
import { runScenario } from "./helpers.js";

export async function relationsAndSerializationScenario(): Promise<void> {
  await runScenario("relations and recursive serialization", async ({ engine }) => {
    const user = await engine.create("users", {
      email: "author@example.com",
      secret: "private-value",
    });
    const post = await engine.create("posts", {
      authorId: user.id,
      title: "Persistence in production",
    });

    const populatedPost = await engine.findOne("posts", {
      where: {
        conditions: [{ field: "id", operator: "eq", value: post.id }],
      },
      populate: ["author"],
    });
    const populatedPostWithAuthor = populatedPost as typeof populatedPost & {
      author: { email: string; secret?: string };
    };
    assert.equal(populatedPostWithAuthor.author.email, "author@example.com");
    assert.equal(
      "secret" in populatedPostWithAuthor.author,
      false,
    );

    const populatedUser = await engine.findOne("users", {
      where: {
        conditions: [{ field: "id", operator: "eq", value: user.id }],
      },
      populate: ["posts"],
    });
    const populatedUserWithPosts = populatedUser as typeof populatedUser & {
      posts: Array<{ title: string }>;
    };
    const posts = populatedUserWithPosts.posts;
    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.title, "Persistence in production");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await relationsAndSerializationScenario();
}
