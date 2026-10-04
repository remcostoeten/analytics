import { describe, expect, expectTypeOf, test } from "bun:test";

import type { AlertEventName, Annotation, CreateAnnotation, TargetInput } from "@spoar/contract";

import { createAdmin, discord, mail, webhook } from "../src/admin/index";
import type {
  AdminResult,
  AnnotationInput,
  MailTarget,
  Target,
  WebhookTarget,
} from "../src/admin/index";
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

  // @ts-expect-error: a Date, a calendar date or an ISO 8601 timestamp
  void admin.annotations.create("skriuw", { title: "Outage", date: "1 October" });
  // @ts-expect-error: http:// or https:// only
  void admin.annotations.create("skriuw", { title: "Mirror", date: "2026-10-01", url: "ftp://x" });
  // @ts-expect-error: release, post, content, incident or other
  void admin.annotations.create("skriuw", { title: "Sale", date: "2026-10-01", kind: "campaign" });
  // @ts-expect-error: at least one change
  void admin.annotations.update("skriuw", "ann_1", {});
  // @ts-expect-error: not in Projects
  void admin.annotations.list("remcostoten.nl");

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

  test("annotation inputs fit the contract once dates are on the wire", () => {
    expectTypeOf<Omit<AnnotationInput, "date" | "endDate">>().toExtend<
      Omit<CreateAnnotation, "date" | "endDate">
    >();
    expectTypeOf(
      admin.annotations.create("skriuw", { title: "Launch", date: new Date() }),
    ).toEqualTypeOf<AdminResult<Annotation>>();
  });

  test("alertRoute handlers get the event narrowed by name", () => {
    expectTypeOf<AlertEventOf<"issue.new">["name"]>().toEqualTypeOf<"issue.new">();
    expectTypeOf<AlertEventOf<"issue.regression">["issue"]["title"]>().toEqualTypeOf<string>();
    expectTypeOf<AlertEventOf<"speed.drop">["speed"]["score"]>().toEqualTypeOf<number>();
    expectTypeOf<AlertEventName>().toEqualTypeOf<"issue.new" | "issue.regression" | "speed.drop">();
  });
});
