type Params = { [name: string]: string | string[] | undefined };

function decode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function matches(segments: string[], at: number, values: string[]) {
  return values.every((value, offset) => {
    const segment = segments[at + offset];
    return segment !== undefined && (segment === value || decode(segment) === value);
  });
}

type Param = { label: string; values: string[] };

function place(segments: string[], params: Param[], from: number): number[] | null {
  const [param, ...rest] = params;
  if (!param) return [];
  for (let at = segments.length - param.values.length; at >= from; at -= 1) {
    if (!matches(segments, at, param.values)) continue;
    const later = place(segments, rest, at + param.values.length);
    if (later) return [at, ...later];
  }
  return null;
}

/**
 * @name computeRoute
 * @description Turns a pathname and the router's params into the route template: a segment equal
 * to a param becomes `[name]` and the run of segments of a catch-all param becomes `[...name]`.
 * Params are placed in the order the router lists them, which is the order of the route, each as
 * late in the path as the params after it allow, so `/blog/blog` with `slug: "blog"` becomes
 * `/blog/[slug]`. When the params cannot all be placed, the pathname is returned unchanged.
 *
 * @example
 * computeRoute("/blog/hello-world", { slug: "hello-world" }); // "/blog/[slug]"
 * computeRoute("/docs/a/b", { path: ["a", "b"] }); // "/docs/[...path]"
 */
export function computeRoute(pathname: string, params: Params | null): string {
  if (!params) return pathname;
  const segments = pathname.split("/");
  const ordered: Param[] = [];
  for (const [name, value] of Object.entries(params)) {
    if (typeof value === "string" && value !== "")
      ordered.push({ label: `[${name}]`, values: [value] });
    if (Array.isArray(value) && value.length > 0)
      ordered.push({ label: `[...${name}]`, values: value });
  }
  const positions = place(segments, ordered, 1);
  if (!positions) return pathname;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const param = ordered[index];
    const at = positions[index];
    if (param && at !== undefined) segments.splice(at, param.values.length, param.label);
  }
  return segments.join("/");
}
