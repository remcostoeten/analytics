import { describe, expect, test } from "bun:test";

import {
  avatarOf,
  formatSignIn,
  grantedRoleOf,
  inviteMessage,
  isLogin,
  loginOf,
  projectsOf,
} from "../src/modules/admin/member-form";

describe("loginOf", () => {
  test("takes the login from a profile link, a handle or the bare login", () => {
    expect(loginOf("https://github.com/octocat/")).toBe("octocat");
    expect(loginOf("github.com/octocat?tab=repositories")).toBe("octocat");
    expect(loginOf("@octocat")).toBe("octocat");
    expect(loginOf("  octocat ")).toBe("octocat");
  });
});

describe("isLogin", () => {
  test("accepts GitHub's login shape only", () => {
    expect(isLogin("octocat")).toBe(true);
    expect(isLogin("a-b")).toBe(true);
    expect(isLogin("-bad")).toBe(false);
    expect(isLogin("bad-")).toBe(false);
    expect(isLogin("double--dash")).toBe(false);
    expect(isLogin("x".repeat(40))).toBe(false);
    expect(isLogin("")).toBe(false);
  });
});

describe("projectsOf", () => {
  test("means every project, the typed ids or none", () => {
    expect(projectsOf(true, "docs")).toBeNull();
    expect(projectsOf(false, "docs\n skriuw \n")).toEqual(["docs", "skriuw"]);
    expect(projectsOf(false, "  ")).toEqual([]);
  });
});

describe("grantedRoleOf", () => {
  test("never grants the owner role", () => {
    expect(grantedRoleOf("admin")).toBe("admin");
    expect(grantedRoleOf("analyst")).toBe("analyst");
    expect(grantedRoleOf("owner")).toBe("viewer");
    expect(grantedRoleOf("")).toBe("viewer");
  });
});

describe("inviteMessage", () => {
  test("names the account and links the dashboard", () => {
    expect(inviteMessage("octocat", "https://docs.example.test")).toBe(
      "You can now sign in to the analytics dashboard with your GitHub account octocat: https://docs.example.test/dashboard",
    );
  });
});

describe("avatarOf", () => {
  test("uses the numeric id when known and the login otherwise", () => {
    expect(avatarOf("octocat", "583231")).toBe(
      "https://avatars.githubusercontent.com/u/583231?s=48",
    );
    expect(avatarOf("octocat", null)).toBe("https://github.com/octocat.png?size=48");
  });
});

describe("formatSignIn", () => {
  test("shows the day or never", () => {
    expect(formatSignIn("2026-10-13T08:12:00.000Z")).toBe("2026-10-13");
    expect(formatSignIn(null)).toBe("never");
  });
});
