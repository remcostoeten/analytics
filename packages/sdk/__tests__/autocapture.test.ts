import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { AutocaptureProps } from "@spoar/contract";
import { Value } from "@sinclair/typebox/value";

import { autocapture, clicks } from "../src/plugins";
import type { AutocaptureOptions } from "../src/plugins";
import { client, fresh, sent } from "./helpers";

function keepPage(event: Event) {
  if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
}

beforeAll(() => document.addEventListener("click", keepPage));
afterAll(() => document.removeEventListener("click", keepPage));

beforeEach(() => {
  fresh();
  document.body.innerHTML = "";
  history.replaceState(null, "", "/pricing");
});

function element(selector: string) {
  const found = document.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`no element for ${selector}`);
  return found;
}

function userClick(target: Element, x: number, y: number, at: number) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    detail: 1,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, "timeStamp", { value: at });
  target.dispatchEvent(event);
}

async function capture(html: string, act: () => void, options?: AutocaptureOptions) {
  const { analytics, transport } = client({ plugins: [autocapture(options)] });
  document.body.innerHTML = html;
  act();
  await analytics.flush();
  await analytics.shutdown();
  return sent(transport)
    .filter((event) => event.name === "autocapture")
    .map((event) => event.props);
}

function submit(form: Element) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function change(field: Element) {
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("kinds", () => {
  test("sends a click with every prop, matching the contract", async () => {
    const [props] = await capture(
      '<a id="cta" href="/signup?ref=mail#top"><span id="inner">  Start   now </span></a>',
      () => element("#inner").click(),
    );
    expect(props).toEqual({
      kind: "click",
      selector: 'a[id="cta"]',
      tag: "a",
      text: "Start now",
      href: "/signup",
      route: "/pricing",
    });
    expect(Value.Check(AutocaptureProps, props)).toBe(true);
  });

  test.each([
    ["button", "<button id='t'>Go</button>"],
    ["role=button", "<div role='button' id='t'>Go</div>"],
    ["submit input", "<input type='submit' id='t' value='Go'>"],
    ["summary", "<details><summary id='t'>Go</summary></details>"],
    ["label", "<label id='t'>Go</label>"],
  ])("records a click on %s", async (_, html) => {
    const events = await capture(html, () => element("#t").click());
    expect(events.map((props) => props.kind)).toEqual(["click"]);
  });

  test("ignores clicks on elements that are not interactive", async () => {
    const events = await capture("<p id='t'>Text</p>", () => element("#t").click());
    expect(events).toEqual([]);
  });

  test("sends a submit with the action path and no field data", async () => {
    const [props] = await capture(
      "<form id='signup' action='/join?plan=pro'><input name='city' value='Leeuwarden'></form>",
      () => submit(element("form")),
    );
    expect(props).toEqual({
      kind: "submit",
      selector: 'form[id="signup"]',
      tag: "form",
      href: "/join",
      route: "/pricing",
    });
  });

  test("leaves change out by default", async () => {
    const events = await capture("<input id='t' value='secret'>", () => change(element("#t")));
    expect(events).toEqual([]);
  });

  test("sends a change without value or text when opted in", async () => {
    const events = await capture(
      "<select id='t'><option>Private choice</option></select><textarea id='a'>Draft</textarea>",
      () => {
        change(element("#t"));
        change(element("#a"));
      },
      { kinds: ["change"] },
    );
    expect(events).toEqual([
      { kind: "change", selector: 'select[id="t"]', tag: "select", route: "/pricing" },
      { kind: "change", selector: 'textarea[id="a"]', tag: "textarea", route: "/pricing" },
    ]);
  });

  test("records only the listed kinds", async () => {
    const events = await capture(
      "<form id='f'><button type='button' id='t'>Go</button></form>",
      () => {
        element("#t").click();
        submit(element("#f"));
      },
      { kinds: ["submit"] },
    );
    expect(events.map((props) => props.kind)).toEqual(["submit"]);
  });

  test("stops listening after cleanup", async () => {
    const { analytics, transport } = client();
    const remove = analytics.use(autocapture());
    document.body.innerHTML = "<button id='t'>Go</button>";
    remove();
    element("#t").click();
    await analytics.flush();
    await analytics.shutdown();
    expect(sent(transport)).toEqual([]);
  });
});

describe("exclusions", () => {
  test.each([
    ["data-spoar-ignore", "<button id='t' data-spoar-ignore>Go</button>"],
    ["an ignored ancestor", "<div data-spoar-ignore><button id='t'>Go</button></div>"],
    ["contenteditable", "<div contenteditable='true'><button id='t'>Go</button></div>"],
    ["plaintext contenteditable", "<div contenteditable='plaintext-only'><a id='t'>Go</a></div>"],
    ["data-spoar-click", "<button id='t' data-spoar-click='go'>Go</button>"],
    ["the older data-ra-click", "<button id='t' data-ra-click='go'>Go</button>"],
    ["a marked ancestor", "<div data-spoar-click='go'><button id='t'>Go</button></div>"],
    ["a label for a password", "<label id='t' for='p'>Pass</label><input id='p' type='password'>"],
    ["a label for an email", "<label id='t'>Mail<input autocomplete='email'></label>"],
  ])("skips a click on %s", async (_, html) => {
    const events = await capture(html, () => element("#t").click());
    expect(events).toEqual([]);
  });

  test.each([
    ["a password", "type='password'"],
    ["email", "autocomplete='email'"],
    ["tel", "autocomplete='tel-national'"],
    ["a card number", "autocomplete='cc-number'"],
    ["a sectioned card", "autocomplete='section-a billing cc-exp'"],
    ["a new password", "autocomplete='new-password'"],
    ["a one-time code", "autocomplete='one-time-code'"],
    ["a name", "autocomplete='given-name'"],
    ["an address", "autocomplete='street-address'"],
  ])("skips a change on %s field", async (_, attributes) => {
    const events = await capture(`<input id='t' ${attributes}>`, () => change(element("#t")), {
      kinds: ["change"],
    });
    expect(events).toEqual([]);
  });

  test("skips a submit on an ignored form", async () => {
    const events = await capture("<form id='t' data-spoar-ignore></form>", () =>
      submit(element("#t")),
    );
    expect(events).toEqual([]);
  });

  test.each([
    ["inside a mask", "<div data-spoar-mask><button id='t'>Private</button></div>"],
    ["holding a mask", "<button id='t'><span data-spoar-mask>Private</span></button>"],
    ["wrapping a field", "<label id='t'>Pick<select><option>Private</option></select></label>"],
  ])("omits text for an element %s", async (_, html) => {
    const [props] = await capture(html, () => element("#t").click());
    expect(props?.kind).toBe("click");
    expect(props).not.toHaveProperty("text");
  });

  test("never sends the value of a submit input", async () => {
    const [props] = await capture("<input type='submit' id='t' value='Pay 40 euro'>", () =>
      element("#t").click(),
    );
    expect(JSON.stringify(props)).not.toContain("Pay");
  });

  test("cuts text at 64 characters", async () => {
    const [props] = await capture(`<button id='t'>${"a".repeat(100)}</button>`, () =>
      element("#t").click(),
    );
    expect(props?.text).toBe("a".repeat(64));
  });
});

describe("href", () => {
  test.each([
    ["/invite/550e8400-e29b-41d4-a716-446655440000", "/invite/:redacted"],
    ["/reset/9f86d081884c7d65", "/reset/:redacted"],
    ["/orders/1234567", "/orders/:redacted"],
    ["/share/aB3dE9xQ/open", "/share/:redacted/open"],
    ["/u/me@example.com", "/u/:redacted"],
    ["/auth/eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl", "/auth/:redacted"],
    ["https://other.example/a/b?token=abc#hash", "/a/b"],
    ["/blog/getting-started-2024-guide", "/blog/getting-started-2024-guide"],
    ["/docs/internationalization", "/docs/internationalization"],
    ["/archive/2026-11-22", "/archive/2026-11-22"],
  ])("%s becomes %s", async (href, expected) => {
    const [props] = await capture(`<a id='t' href='${href}'>Go</a>`, () => element("#t").click());
    expect(props?.href).toBe(expected);
  });

  test.each(["mailto:me@example.com", "tel:+31612345678", "javascript:void(0)"])(
    "leaves out %s",
    async (href) => {
      const [props] = await capture(`<a id='t' href='${href}'>Go</a>`, () => element("#t").click());
      expect(props).not.toHaveProperty("href");
    },
  );

  test("redacts a token in the route", async () => {
    history.replaceState(null, "", "/invite/550e8400-e29b-41d4-a716-446655440000");
    const [props] = await capture("<button id='t'>Go</button>", () => element("#t").click());
    expect(props?.route).toBe("/invite/:redacted");
  });

  test("uses the route template when an adapter set one", async () => {
    const { analytics, transport } = client({ plugins: [autocapture()] });
    analytics.route("/invite/[token]");
    document.body.innerHTML = "<button id='t'>Go</button>";
    element("#t").click();
    await analytics.flush();
    await analytics.shutdown();
    expect(sent(transport)[0]?.props.route).toBe("/invite/[token]");
  });
});

describe("selector", () => {
  test("prefers data-testid, then name, then position", async () => {
    const events = await capture(
      "<div data-testid='hero'><button id='a'>A</button></div>" +
        "<section data-testid='plans'><span><button>B</button></span></section>" +
        "<button name='buy'>C</button>" +
        "<main><p></p><button>D</button></main>",
      () => {
        for (const button of document.querySelectorAll("button")) button.click();
      },
    );
    expect(events.map((props) => props.selector)).toEqual([
      'button[id="a"]',
      'section[data-testid="plans"]>span:nth-child(1)>button:nth-child(1)',
      'button[name="buy"]',
      "body:nth-child(2)>main:nth-child(4)>button:nth-child(2)",
    ]);
  });

  test("does not use a token-like id", async () => {
    const [props] = await capture("<button id='a1b2c3d4e5f6a7b8'>Go</button>", () =>
      element("button").click(),
    );
    expect(props?.selector).not.toContain("a1b2c3d4");
  });
});

describe("rage", () => {
  const rageOnly: AutocaptureOptions = { kinds: ["rage"] };

  async function rage(clicks: [number, number, number][], html = "<button id='t'>Pay</button>") {
    const events = await capture(
      html,
      () => {
        for (const [x, y, at] of clicks) userClick(element("#t"), x, y, at);
      },
      rageOnly,
    );
    return events;
  }

  test("sends one event with selector and text on the third click", async () => {
    const events = await rage([
      [10, 10, 1000],
      [11, 10, 1300],
      [12, 11, 1600],
    ]);
    expect(events).toEqual([
      { kind: "rage", selector: 'button[id="t"]', tag: "button", text: "Pay", route: "/pricing" },
    ]);
  });

  test("sends one event however long the burst goes on", async () => {
    const events = await rage([
      [10, 10, 1000],
      [10, 10, 1100],
      [10, 10, 1200],
      [10, 10, 1300],
      [10, 10, 1400],
      [10, 10, 1500],
    ]);
    expect(events).toHaveLength(1);
  });

  test("sends a second event for a new burst", async () => {
    const events = await rage([
      [10, 10, 1000],
      [10, 10, 1100],
      [10, 10, 1200],
      [10, 10, 2300],
      [10, 10, 2400],
      [10, 10, 2500],
    ]);
    expect(events).toHaveLength(2);
  });

  test("counts three clicks inside exactly one second", async () => {
    const events = await rage([
      [10, 10, 1000],
      [10, 10, 1500],
      [10, 10, 2000],
    ]);
    expect(events).toHaveLength(1);
  });

  test("does not count three clicks spread over more than one second", async () => {
    const events = await rage([
      [10, 10, 1000],
      [10, 10, 1501],
      [10, 10, 2001],
    ]);
    expect(events).toEqual([]);
  });

  test("counts clicks at exactly 30 px", async () => {
    const events = await rage([
      [10, 10, 1000],
      [40, 10, 1100],
      [10, 10, 1200],
    ]);
    expect(events).toHaveLength(1);
  });

  test("does not count clicks beyond 30 px", async () => {
    const events = await rage([
      [10, 10, 1000],
      [41, 10, 1100],
      [10, 10, 1200],
    ]);
    expect(events).toEqual([]);
  });

  test("is off by default", async () => {
    const events = await capture("<button id='t'>Pay</button>", () => {
      for (const at of [1000, 1100, 1200]) userClick(element("#t"), 10, 10, at);
    });
    expect(events.map((props) => props.kind)).toEqual(["click", "click", "click"]);
  });

  test("sends clicks and the rage event together when both are on", async () => {
    const events = await capture(
      "<button id='t'>Pay</button>",
      () => {
        for (const at of [1000, 1100, 1200]) userClick(element("#t"), 10, 10, at);
      },
      { kinds: ["click", "rage"] },
    );
    expect(events.map((props) => props.kind)).toEqual(["click", "click", "click", "rage"]);
  });

  test("ignores programmatic clicks", async () => {
    const events = await capture(
      "<button id='t'>Pay</button>",
      () => {
        for (let count = 0; count < 3; count += 1) element("#t").click();
      },
      rageOnly,
    );
    expect(events).toEqual([]);
  });

  test("does not count triple-clicks on plain text", async () => {
    const events = await rage(
      [
        [10, 10, 1000],
        [10, 10, 1100],
        [10, 10, 1200],
      ],
      "<p id='t'>Select this sentence</p>",
    );
    expect(events).toEqual([]);
  });

  test("skips excluded elements", async () => {
    const events = await rage(
      [
        [10, 10, 1000],
        [10, 10, 1100],
        [10, 10, 1200],
      ],
      "<button id='t' data-spoar-ignore>Pay</button>",
    );
    expect(events).toEqual([]);
  });
});

describe("labels", () => {
  test("counts a label click once when the browser forwards it to its field", async () => {
    const events = await capture("<label id='t'>Accept<input type='checkbox' id='c'></label>", () =>
      element("#t").click(),
    );
    expect(events).toHaveLength(1);
  });

  test("forwarded label clicks do not add up to rage", async () => {
    const events = await capture(
      "<label id='t'>Accept<input type='checkbox' id='c'></label>",
      () => {
        userClick(element("#t"), 10, 10, 1000);
        userClick(element("#t"), 10, 10, 1100);
      },
      { kinds: ["rage"] },
    );
    expect(events).toEqual([]);
  });
});

describe("clicks() overlap", () => {
  test("a marked element sends only the click event", async () => {
    const { analytics, transport } = client({ plugins: [clicks(), autocapture()] });
    document.body.innerHTML =
      "<button id='marked' data-spoar-click='upgrade'>Up</button><button id='plain'>Plain</button>";
    element("#marked").click();
    element("#plain").click();
    await analytics.flush();
    await analytics.shutdown();
    expect(
      sent(transport).map((event) => [event.name, event.props.label ?? event.props.kind]),
    ).toEqual([
      ["click", "upgrade"],
      ["autocapture", "click"],
    ]);
  });
});
