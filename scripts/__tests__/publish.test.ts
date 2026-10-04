import { describe, expect, test } from "bun:test";
import { prereleaseTag, publishManifest } from "../publish";

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

describe("prereleaseTag", () => {
  test("reads the pre mode tag", () => {
    expect(prereleaseTag('{"mode":"pre","tag":"next"}')).toBe("next");
  });

  test("falls back to latest", () => {
    expect(prereleaseTag(null)).toBe("latest");
    expect(prereleaseTag('{"mode":"exit","tag":"next"}')).toBe("latest");
  });
});
