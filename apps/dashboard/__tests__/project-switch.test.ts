import { expect, test } from "bun:test";

import { projectSwitchPath } from "../src/modules/shell/components/sidebar";

test("a switch keeps the page", () => {
  expect(projectSwitchPath("/projects/doradb.app/visits", "skriuw.com")).toBe(
    "/projects/skriuw.com/visits",
  );
  expect(projectSwitchPath("/projects/doradb.app/speed/inp", "skriuw.com")).toBe(
    "/projects/skriuw.com/speed/inp",
  );
  expect(projectSwitchPath("/projects/doradb.app", "skriuw.com")).toBe("/projects/skriuw.com");
});

test("a record page falls back to its list", () => {
  expect(projectSwitchPath("/projects/doradb.app/issues/iss_12", "skriuw.com")).toBe(
    "/projects/skriuw.com/issues",
  );
  expect(projectSwitchPath("/projects/doradb.app/visitors/01a1", "skriuw.com")).toBe(
    "/projects/skriuw.com/visitors",
  );
  expect(projectSwitchPath("/projects/doradb.app/sessions/s1", "skriuw.com")).toBe(
    "/projects/skriuw.com/visitors",
  );
});

test("outside a project it opens the project", () => {
  expect(projectSwitchPath("/", "a b")).toBe("/projects/a%20b");
  expect(projectSwitchPath("/admin/projects/doradb.app", "skriuw.com")).toBe(
    "/projects/skriuw.com",
  );
});
