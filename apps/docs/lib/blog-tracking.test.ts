import { describe, expect, test } from "bun:test";

import type { BeforeSend } from "@spoar/sdk";

import { blogClick, keepReadingOnBlog } from "./blog-tracking";

type TrackedEvent = Parameters<BeforeSend>[0];

function eventOn(name: string, path: string): TrackedEvent {
  return {
    id: "019ab2c4-7e10-7c3a-9f21-5d0e8a41b6c7",
    name,
    ts: "2026-11-23T20:15:00.000Z",
    visitor: "visitor",
    session: "session",
    page: { path },
    props: {},
  };
}

describe("blogClick", () => {
  test("names the link, the post and its placement", () => {
    expect(blogClick("blog-post", "party-game-custom-data", "home-banner")).toEqual({
      "data-spoar-click": "blog-post",
      "data-spoar-prop-post": "party-game-custom-data",
      "data-spoar-prop-placement": "home-banner",
    });
  });
});

describe("keepReadingOnBlog", () => {
  test.each(["engagement", "scroll_depth"])("keeps %s on a blog post", (name) => {
    const event = eventOn(name, "/blog/party-game-custom-data");
    expect(keepReadingOnBlog(event)).toBe(event);
  });

  test.each(["/", "/blog", "/docs/guides/custom-events"])("drops reading events on %s", (path) => {
    expect(keepReadingOnBlog(eventOn("engagement", path))).toBeNull();
    expect(keepReadingOnBlog(eventOn("scroll_depth", path))).toBeNull();
  });

  test("passes other events on every page", () => {
    const event = eventOn("pageview", "/docs");
    expect(keepReadingOnBlog(event)).toBe(event);
  });
});
