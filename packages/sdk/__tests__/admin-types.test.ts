import { describe, expect, expectTypeOf, test } from "bun:test";

import type { AlertEventName, TargetInput } from "@remcostoeten/analytics-contract";

import { createAdmin, discord, mail, webhook } from "../src/admin/index";
import type { AdminResult, MailTarget, Target, WebhookTarget } from "../src/admin/index";
import { alertRoute } from "../src/server/index";
import type { AlertEventOf } from "../src/server/index";

type Projects = "remcostoeten.nl" | "skriuw";

const admin = createAdmin<Projects>({ endpoint: "https://api.example.test", token: "rat_test" });
const url = "https://ops.example.com/hooks/analytics";

function editorCatches() {
  // @ts-expect-error: not in Projects
  void admin.alerts.sync("remcostoten.nl", [mail({ to: ["remco@gmail.com"] })]);
  // @ts-expect-error: not in Projects
  void admin.stats("remcostoten.nl");

  // @ts-expect-error: offers issue.new and issue.regression
  void mail({ to: ["remco@gmail.com"], on: ["issue.created"] });
  // @ts-expect-error: at least one event
  void webhook({ url, on: [] });

  // @ts-expect-error: at least one address
  void mail({ to: [] });
  // @ts-expect-error: `${string}@${string}.${string}`
  void mail({ to: ["remco"] });

  // @ts-expect-error: https:// only
  void webhook({ url: "http://ops.example.com/hooks" });
  // @ts-expect-error: https:// only
  void discord({ url: "http://discord.com/api/webhooks/1/abc" });

  // @ts-expect-error: two targets named ops
  void admin.alerts.sync("skriuw", [webhook({ name: "ops", url }), discord({ name: "ops", url })]);
  // @ts-expect-error: both default to the name mail
  void admin.alerts.sync("skriuw", [
    mail({ to: ["remco@gmail.com"] }),
    mail({ to: ["ops@example.com"] }),
  ]);
  // @ts-expect-error: the unnamed webhook is already called webhook
  void admin.alerts.sync("skriuw", [webhook({ url }), discord({ name: "webhook", url })]);

  void alertRoute({
    secret: "whsec_test",
    on: {
      "issue.new": async () => {},
      // @ts-expect-error: not an alert event
      "issue.created": async () => {},
    },
  });
}

describe("admin types", () => {
  test("the type errors above stay type errors", () => {
    expect(editorCatches).toBeFunction();
  });

  test("builders keep the literal name, or default it to the channel", () => {
    expectTypeOf(mail({ to: ["remco@gmail.com"] })).toEqualTypeOf<MailTarget<"mail">>();
    expectTypeOf(webhook({ name: "ops", url })).toEqualTypeOf<WebhookTarget<"ops">>();
  });

  test("targets fit the contract's TargetInput", () => {
    expectTypeOf<Target>().toExtend<TargetInput>();
  });

  test("sync accepts distinct names and answers the changes", () => {
    const synced = admin.alerts.sync("remcostoeten.nl", [
      mail({ to: ["remco@gmail.com"] }),
      discord({ url: "https://discord.com/api/webhooks/1/abc", on: ["issue.regression"] }),
      webhook({ name: "ops", url }),
      webhook({ name: "ci", url }),
    ]);
    expectTypeOf(synced).toEqualTypeOf<
      AdminResult<{
        created: string[];
        updated: string[];
        removed: string[];
        secrets: { [key: string]: string };
      }>
    >();
  });

  test("alertRoute handlers get the event narrowed by name", () => {
    expectTypeOf<AlertEventOf<"issue.new">["name"]>().toEqualTypeOf<"issue.new">();
    expectTypeOf<AlertEventOf<"issue.regression">["issue"]["title"]>().toEqualTypeOf<string>();
    expectTypeOf<AlertEventName>().toEqualTypeOf<"issue.new" | "issue.regression">();
  });
});
