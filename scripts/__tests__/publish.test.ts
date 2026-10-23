import { describe, expect, test } from "bun:test";
import { isPrerelease, pinWorkspaceRanges, publishManifest } from "../publish";

describe("publishManifest", () => {
  test("moves publishConfig.exports into exports and drops devDependencies", () => {
    const packed = publishManifest({
      name: "@spoar/sdk",
      version: "2.0.0",
      exports: { ".": "./src/index.ts" },
      devDependencies: { tsdown: "catalog:tsdown" },
      publishConfig: { exports: { ".": "./dist/index.mjs" } },
    });
    expect(packed.exports).toEqual({ ".": "./dist/index.mjs" });
    expect(packed.publishConfig).toBeUndefined();
    expect(packed.devDependencies).toBeUndefined();
  });

  test("keeps other publishConfig fields", () => {
    const packed = publishManifest({
      name: "a",
      version: "1.0.0",
      publishConfig: { access: "public", exports: { ".": "./dist/index.mjs" } },
    });
    expect(packed.publishConfig).toEqual({ access: "public" });
  });

  test("returns a manifest without publishConfig.exports as it is", () => {
    const manifest = { name: "a", version: "1.0.0", devDependencies: { b: "1" } };
    expect(publishManifest(manifest)).toBe(manifest);
  });
});

describe("isPrerelease", () => {
  test("flags versions with a prerelease part", () => {
    expect(isPrerelease("2.0.0-next.3")).toBe(true);
    expect(isPrerelease("0.1.0-beta.0")).toBe(true);
  });

  test("passes stable versions", () => {
    expect(isPrerelease("2.0.0")).toBe(false);
    expect(isPrerelease("0.1.0")).toBe(false);
  });
});

describe("pinWorkspaceRanges", () => {
  const versions = new Map([
    ["@spoar/debugtools", "0.2.0"],
    ["@spoar/client", "2.0.1"],
  ]);

  test("fills workspace ranges from the workspace versions, not the lockfile", () => {
    const pinned = pinWorkspaceRanges(
      {
        name: "@spoar/sdk",
        version: "2.2.1",
        dependencies: {
          "@spoar/debugtools": "workspace:^",
          "@spoar/client": "workspace:*",
          "web-vitals": "6.2.2",
        },
        peerDependencies: { "@spoar/client": "workspace:~" },
      },
      versions,
    );
    expect(pinned.dependencies).toEqual({
      "@spoar/debugtools": "^0.2.0",
      "@spoar/client": "2.0.1",
      "web-vitals": "6.2.2",
    });
    expect(pinned.peerDependencies).toEqual({ "@spoar/client": "~2.0.1" });
  });

  test("keeps an explicit range and an unknown workspace name as written", () => {
    const pinned = pinWorkspaceRanges(
      {
        name: "a",
        version: "1.0.0",
        dependencies: { "@spoar/debugtools": "workspace:>=0.2.0", other: "workspace:*" },
      },
      versions,
    );
    expect(pinned.dependencies).toEqual({ "@spoar/debugtools": ">=0.2.0", other: "workspace:*" });
  });
});
