import type { createPlayground } from "../setup.js";

export type Playground = Awaited<ReturnType<typeof createPlayground>>;

export async function runScenario(
  name: string,
  scenario: (playground: Playground) => Promise<void>,
): Promise<void> {
  const { createPlayground } = await import("../setup.js");
  const playground = await createPlayground();
  const startedAt = performance.now();

  try {
    await scenario(playground);
    const duration = Math.round(performance.now() - startedAt);
    console.log(`PASS ${name} (${duration}ms)`);
  } finally {
    await playground.close();
  }
}
