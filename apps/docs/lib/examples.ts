type ExampleStack = "next" | "react" | "vanilla" | "node";

export type Example = {
  slug: string;
  title: string;
  stack: ExampleStack;
  description: string;
  directory: string;
  files: string[];
  preview?: string;
  tutorial?: string;
};

const examples: Example[] = [
  {
    slug: "dashboard",
    title: "Dashboard on @spoar/client",
    stack: "react",
    description:
      "Stats tiles, a visitors chart, breakdowns, countries and a live stream for one project, read through the typed client, with the page tracking itself through the SDK.",
    directory: "dashboard",
    tutorial: "/docs/tutorial/create-a-project",
    files: [
      "src/app.tsx",
      "src/main.tsx",
      "src/api.ts",
      "src/use-read.ts",
      "src/state.ts",
      "src/settings.ts",
      "src/analytics.ts",
      "src/events.ts",
      "src/format.ts",
      "src/components/settings-bar.tsx",
      "src/components/controls.tsx",
      "src/components/read-frame.tsx",
      "src/components/stats-tiles.tsx",
      "src/components/timeseries-chart.tsx",
      "src/components/breakdown-table.tsx",
      "src/components/country-table.tsx",
      "src/components/realtime.tsx",
      "src/styles.css",
      "index.html",
      "package.json",
    ],
  },
];

/**
 * @name getExample
 * @description Finds the registered example with the given slug, or undefined when no example
 * uses it.
 *
 * @example
 * const example = getExample("next-app-router");
 * if (!example) notFound();
 */
export function getExample(slug: string) {
  return examples.find((example) => example.slug === slug);
}

/**
 * @name listExamples
 * @description Lists every registered example in registry order.
 *
 * @example
 * const params = listExamples().map((example) => ({ slug: example.slug }));
 */
export function listExamples() {
  return examples;
}
