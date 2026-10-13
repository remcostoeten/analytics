import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Console } from "../src/console";
import { consoleFixture } from "../src/fixtures";

describe("Console", () => {
  test("renders the final frame when autoplay is off", () => {
    const html = renderToStaticMarkup(<Console autoplay={false} sections={{ agent: true }} />);
    expect(html).toContain(consoleFixture.agent.prompt);
    expect(html).toContain(consoleFixture.agent.followUp);
    expect(html).toContain("Likely cause:");
    expect(html).toContain("summarize");
  });

  test("starts empty when autoplay is on", () => {
    const html = renderToStaticMarkup(<Console sections={{ agent: true }} />);
    expect(html).not.toContain(consoleFixture.agent.followUp);
  });

  test("leaves the agent pane out by default and keeps the recent queries", () => {
    const html = renderToStaticMarkup(<Console autoplay={false} />);
    expect(html).not.toContain(consoleFixture.agent.prompt);
    expect(html).toContain("Recent queries");
    expect(html).toContain("Dataset library");
  });

  test("leaves out every section that is turned off", () => {
    const html = renderToStaticMarkup(
      <Console
        autoplay={false}
        sections={{ nav: false, toolbar: false, results: false, library: false, recent: false }}
      />,
    );
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("Query mode");
    expect(html).not.toContain("Results");
    expect(html).not.toContain("Dataset library");
    expect(html).not.toContain("Recent queries");
    expect(html).toContain("summarize");
  });

  test("shows the agent on its own when the recent queries are off", () => {
    const html = renderToStaticMarkup(
      <Console autoplay={false} sections={{ agent: true, recent: false }} />,
    );
    expect(html).toContain(consoleFixture.agent.followUp);
    expect(html).not.toContain("Recent queries");
  });

  test("renders the dark theme by default and the theme it is given", () => {
    expect(renderToStaticMarkup(<Console autoplay={false} />)).toContain('data-theme="dark"');
    expect(renderToStaticMarkup(<Console autoplay={false} theme="light" />)).toContain(
      'data-theme="light"',
    );
  });
});
