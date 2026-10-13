import { expect, test } from "bun:test";

import { parseInitOptions } from "../spoar-init";

test("parses explicit framework and project paths", () => {
  expect(
    parseInitOptions(
      [
        "--directory",
        "/tmp/site",
        "--framework",
        "next-pages",
        "--app-directory",
        "pages",
        "--lib-directory",
        "src/analytics",
        "--project",
        "example.com",
        "--public-key",
        "pk_live_demo",
      ],
      {},
    ),
  ).toEqual({
    ok: true,
    value: {
      directory: "/tmp/site",
      endpoint: "https://api.analytics.remcostoeten.nl",
      force: false,
      framework: "next-pages",
      appDirectory: "/tmp/site/pages",
      libDirectory: "/tmp/site/src/analytics",
      noInstall: false,
      project: "example.com",
      publicKey: "pk_live_demo",
      secretKey: null,
      writeEnv: false,
      dryRun: false,
    },
  });
});

test("rejects an unsupported framework override", () => {
  expect(
    parseInitOptions(["--framework", "solid", "--project", "site", "--public-key", "pk"]),
  ).toEqual(expect.objectContaining({ ok: false }));
});
