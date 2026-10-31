import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { dashboardPort } from "../dashboard-port";
import { adminCookie } from "../ports";

const origin = `http://localhost:${dashboardPort}`;
const base = `${origin}/dashboard`;
const project = "/projects/site";

type Route = {
  name: string;
  path: string;
  from: string;
  link: string;
  skeleton: string;
  shell: (page: Page) => Locator;
  deferred?: (page: Page) => Locator;
  hydrates?: boolean;
};

function heading(name: string) {
  return (page: Page) => page.getByRole("heading", { name, exact: true });
}

function text(value: string) {
  return (page: Page) => page.getByText(value, { exact: true }).filter({ visible: true });
}

const routes: Route[] = [
  {
    name: "home",
    skeleton: "home",
    path: "",
    from: "/admin/tokens",
    link: "Home",
    shell: heading("Overview"),
    deferred: text("Core Web Vitals"),
    hydrates: true,
  },
  {
    name: "web analytics",
    skeleton: "analytics",
    path: project,
    from: `${project}/overview`,
    link: "Web analytics",
    shell: heading("Web analytics for site"),
    deferred: text("Visitors summary"),
  },
  {
    name: "overview",
    skeleton: "overview",
    path: `${project}/overview`,
    from: project,
    link: "Overview",
    shell: heading("Traffic overview"),
    deferred: text("Page views over time"),
  },
  {
    name: "speed",
    skeleton: "speed",
    path: `${project}/speed`,
    from: project,
    link: "Speed",
    shell: heading("Speed for site"),
    deferred: text("Largest Contentful Paint at p75"),
  },
  {
    name: "realtime",
    skeleton: "realtime",
    path: `${project}/realtime`,
    from: project,
    link: "Realtime",
    shell: heading("Realtime for site"),
    deferred: text("Live events"),
  },
  {
    name: "logs",
    skeleton: "logs",
    path: `${project}/logs`,
    from: project,
    link: "Logs",
    shell: heading("Logs"),
    deferred: text("Page views by outcome over time"),
  },
  {
    name: "issues",
    skeleton: "panel",
    path: `${project}/issues`,
    from: project,
    link: "Issues",
    shell: heading("Issues for site"),
  },
  {
    name: "visitors",
    skeleton: "panel",
    path: `${project}/visitors`,
    from: project,
    link: "Visitors",
    shell: heading("Visitors of site"),
  },
  {
    name: "projects",
    skeleton: "projects",
    path: "/admin/projects",
    from: "",
    link: "Projects",
    shell: heading("Projects"),
  },
  {
    name: "project settings",
    skeleton: "project",
    path: "/admin/projects/site",
    from: project,
    link: "Settings",
    shell: heading("site"),
    deferred: (page) =>
      page
        .getByText(/^(Last 24 hours|Could not load the connection status: .+)$/)
        .filter({ visible: true }),
  },
  {
    name: "new project",
    skeleton: "new-project",
    path: "/admin/projects/new",
    from: "/admin/projects",
    link: "New project",
    shell: heading("New project"),
  },
  {
    name: "tokens",
    skeleton: "tokens",
    path: "/admin/tokens",
    from: "",
    link: "API tokens",
    shell: heading("API tokens"),
  },
];

function atPath(path: string) {
  return (url: URL) => url.pathname === `/dashboard${path}`;
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: adminCookie, value: "1", url: origin }]);
});

test("the build serves only the static shell to a locked page load", async ({ request }) => {
  const headers = { cookie: `${adminCookie}=1; next-instant-navigation-testing=1` };
  const locked = await (await request.get(`${base}/admin/tokens`, { headers })).text();
  const open = await (
    await request.get(`${base}/admin/tokens`, { headers: { cookie: `${adminCookie}=1` } })
  ).text();
  expect(open).toContain("API tokens</h1>");
  expect(locked).not.toContain("API tokens</h1>");
  expect(locked).toContain('aria-busy="true"');
});

for (const route of routes) {
  test(`a page load of ${route.name} shows its skeleton`, async ({ page, request }) => {
    if (route.hydrates) {
      const headers = { cookie: `${adminCookie}=1; next-instant-navigation-testing=1` };
      const locked = await (await request.get(`${base}${route.path}`, { headers })).text();
      expect(locked).toContain(`data-testid="${route.skeleton}-skeleton"`);
      expect(locked).not.toContain("</h1>");
      return;
    }
    await instant(
      page,
      async () => {
        await page.goto(`${base}${route.path}`);
        await expect(page.getByTestId(`${route.skeleton}-skeleton`)).toBeVisible();
        await expect(route.shell(page)).toHaveCount(0);
      },
      { baseURL: origin },
    );
  });

  test(`a client navigation to ${route.name} renders its shell without the server`, async ({
    page,
  }) => {
    await page.goto(`${base}${route.from}`);
    const trigger = page
      .getByRole("link", { name: route.link, exact: true })
      .and(page.locator(`[href="/dashboard${route.path}"]`))
      .first();
    await expect(trigger).toBeVisible();
    await instant(page, async () => {
      await trigger.click();
      await page.waitForURL(atPath(route.path));
      await expect(route.shell(page)).toBeVisible();
    });
    if (route.deferred) await expect(route.deferred(page).first()).toBeVisible();
  });
}

const details = [
  { name: "a visitor", path: `${project}/visitors/visitor-shell` },
  { name: "a session", path: `${project}/sessions/session-shell` },
  { name: "an issue", path: `${project}/issues/issue-shell` },
];

for (const detail of details) {
  test(`a page load of ${detail.name} shows its skeleton`, async ({ page }) => {
    await instant(
      page,
      async () => {
        await page.goto(`${base}${detail.path}`);
        await expect(page.getByTestId("detail-skeleton")).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
      },
      { baseURL: origin },
    );
  });
}
