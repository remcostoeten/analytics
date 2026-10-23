const fallbackProject = "docs.analytics.remcostoeten.nl";

/**
 * @name siteProject
 * @description The project this site tracks itself into, from `NEXT_PUBLIC_SPOAR_CONFIG`, else the
 * production docs project. Read on the server and in the browser alike.
 *
 * @example
 * siteProject(); // "docs.analytics.remcostoeten.nl"
 */
export function siteProject() {
  try {
    const config: { project?: string } = JSON.parse(
      process.env.NEXT_PUBLIC_SPOAR_CONFIG ?? process.env.NEXT_PUBLIC_RA_CONFIG ?? "{}",
    );
    return config.project || fallbackProject;
  } catch {
    return fallbackProject;
  }
}
