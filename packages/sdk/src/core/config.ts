type Loose = { [key: string]: unknown };
type Meta = { env?: { [name: string]: string | undefined } };

/**
 * @name readEnv
 * @description Runs a literal `process.env.NAME` read, giving undefined where `process` does not
 * exist, as in a browser bundle that did not inline the variable.
 *
 * @example
 * readEnv(() => process.env.NODE_ENV);
 */
export function readEnv(read: () => string | undefined): string | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/**
 * @name parseConfig
 * @description Parses the JSON of a build config variable, or gives an empty object when the
 * variable is unset or not valid JSON.
 *
 * @example
 * parseConfig('{"endpoint":"/_ra"}'); // { endpoint: "/_ra" }
 */
export function parseConfig(text: string | undefined): Loose {
  try {
    return (JSON.parse(text || "{}") as Loose | null) ?? {};
  } catch {
    return {};
  }
}

/**
 * @name mergeConfig
 * @description Lays explicit options over the build config, skipping explicit options that are
 * `undefined`, so `release: process.env.RELEASE` does not erase a release set in the variable.
 *
 * @example
 * mergeConfig({ endpoint: "/_ra" }, { key: "pk_test", endpoint: undefined }); // { endpoint: "/_ra", key: "pk_test" }
 */
export function mergeConfig<Config extends object>(base: Loose, explicit: Config): Config {
  const merged: Loose = { ...base };
  for (const [name, value] of Object.entries(explicit)) {
    if (value !== undefined) merged[name] = value;
  }
  return merged as Config;
}

/**
 * @name browserConfig
 * @description The browser build config: the JSON in `NEXT_PUBLIC_RA_CONFIG`, else in
 * `PUBLIC_RA_CONFIG` or `VITE_RA_CONFIG`. Each is read with literal `process.env` or
 * `import.meta.env` access, the only form bundlers inline.
 *
 * @example
 * browserConfig(); // { project: "remcostoeten.nl", key: "pk_test", endpoint: "/_ra" }
 */
export function browserConfig(): Loose {
  const env = (import.meta as Meta).env;
  return parseConfig(
    readEnv(() => process.env.NEXT_PUBLIC_RA_CONFIG) ??
      env?.PUBLIC_RA_CONFIG ??
      env?.VITE_RA_CONFIG,
  );
}
