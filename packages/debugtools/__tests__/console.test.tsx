import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Console } from "../src/console";
import { consoleFixture } from "../src/fixtures";

describe("Console", () => {
  test("renders the final frame when autoplay is off", () => {
    const html = renderToStaticMarkup(<Console autoplay={false} />);
    expect(html).toContain(consoleFixture.agent.prompt);
    expect(html).toContain(consoleFixture.agent.followUp);
    expect(html).toContain("Likely cause:");
    expect(html).toContain("summarize");
  });

  test("starts empty when autoplay is on", () => {
    const html = renderToStaticMarkup(<Console />);
    expect(html).not.toContain(consoleFixture.agent.followUp);
  });
});
