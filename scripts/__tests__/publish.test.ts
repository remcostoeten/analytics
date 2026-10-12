import { describe, expect, test } from "bun:test";
import { isPrerelease, publishManifest } from "../publish";

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
