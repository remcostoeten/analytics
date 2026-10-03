type ExampleStack = "next" | "react" | "vanilla" | "node";

export type Example = {
  slug: string;
  title: string;
  stack: ExampleStack;
  description: string;
  directory: string;
  files: string[];
  preview?: string;
};

const examples: Example[] = [];

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
