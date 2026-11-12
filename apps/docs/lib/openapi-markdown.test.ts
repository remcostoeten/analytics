import { describe, expect, test } from "bun:test";

import { operationMarkdown } from "./openapi-markdown";

describe("operationMarkdown", () => {
  test("renders the route, its parameters, grouped errors and the schemas they reference", async () => {
    const markdown = await operationMarkdown("get-v2-projects-project-stats");

    expect(markdown).toStartWith("`GET /v2/projects/{project}/stats`");
    expect(markdown).toContain("| `project` | path | yes | string |");
    expect(markdown).toContain("### 400, 401, 403, 404");
    expect(markdown).toContain("### ApiError");
  });

  test("answers undefined for a slug no route has", async () => {
    expect(await operationMarkdown("get-v2-nope")).toBeUndefined();
  });
});
