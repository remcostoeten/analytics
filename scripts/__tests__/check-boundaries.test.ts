import { describe, expect, test } from "bun:test";

import { findViolations, importSpecifiers } from "../check-boundaries";

const workspaces = [
  { name: "@spoar/shared", directory: "packages/shared" },
  { name: "@spoar/contract", directory: "packages/contract" },
  { name: "@spoar/engine", directory: "packages/engine" },
  { name: "@spoar/sdk", directory: "packages/sdk" },
  { name: "@remcostoeten/ingestion", directory: "v1/packages/ingestion" },
];

function reasons(path: string, content: string) {
  return findViolations(workspaces, [{ path, content }]).map((violation) => violation.reason);
}

describe("importSpecifiers", () => {
  test("finds static, type-only, re-export and dynamic imports", () => {
    const content = [
      'import { ok } from "@spoar/shared/result";',
      'import type { Static } from "typebox";',
      'export * from "./events";',
      'const engine = await import("@spoar/engine");',
      'import "./side-effect";',
    ].join("\n");
    expect(importSpecifiers(content)).toEqual([
      "@spoar/shared/result",
      "typebox",
      "./events",
      "@spoar/engine",
      "./side-effect",
    ]);
  });
});

describe("findViolations", () => {
  const cases = [
    {
      name: "contract may import shared",
      path: "packages/contract/src/events.ts",
      content: 'import { noop } from "@spoar/shared/noop";',
      expected: [],
    },
    {
      name: "shared may not import contract",
      path: "packages/shared/src/result.ts",
      content: 'import type { ErrorCode } from "@spoar/contract";',
      expected: ["packages/shared may not import packages/contract"],
    },
    {
      name: "contract may not import engine",
      path: "packages/contract/src/index.ts",
      content: 'export * from "@spoar/engine";',
      expected: ["packages/contract may not import packages/engine"],
    },
    {
      name: "engine may import contract and shared",
      path: "packages/engine/src/pipeline.ts",
      content:
        'import { ErrorCode } from "@spoar/contract";\nimport { ok } from "@spoar/shared/result";',
      expected: [],
    },
    {
      name: "relative imports stay inside the package",
      path: "packages/contract/src/events.ts",
      content: 'import { noop } from "../../shared/src/noop";',
      expected: ["relative import leaves packages/contract"],
    },
    {
      name: "v2 never imports v1 by name",
      path: "packages/engine/src/geo.ts",
      content: 'import { lookup } from "@remcostoeten/ingestion";',
      expected: ["v2 code never imports from v1/"],
    },
    {
      name: "v2 never imports v1 by path",
      path: "packages/engine/src/geo.ts",
      content: 'import { lookup } from "../../../v1/packages/ingestion/src/geo";',
      expected: ["v2 code never imports from v1/"],
    },
    {
      name: "external packages are not checked",
      path: "packages/shared/src/noop.ts",
      content: 'import Type from "typebox";',
      expected: [],
    },
    {
      name: "v1 files are skipped",
      path: "v1/packages/ingestion/src/app.ts",
      content: 'import { anything } from "@spoar/engine";',
      expected: [],
    },
  ];

  for (const { name, path, content, expected } of cases) {
    test(name, () => {
      expect(reasons(path, content)).toEqual(expected);
    });
  }
});
