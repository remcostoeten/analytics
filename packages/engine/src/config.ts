import type { Nullable } from "@spoar/shared/semantic";

import type { AlertsPlugin } from "./alerts/plugin";

export type ServerPlugin = AlertsPlugin;

export type PluginName = ServerPlugin["name"];

export type AnalyticsConfig = { plugins: ServerPlugin[] };

/**
 * @name defineConfig
 * @description Types a deployment's `analytics.config.ts`: the server plugins it turns on. A
 * plugin left out adds no routes, no jobs and runs no code.
 *
 * @example
 * export default defineConfig({ plugins: [alerts({ channels: [webhook()] })] });
 */
export function defineConfig(config: AnalyticsConfig): AnalyticsConfig {
  return config;
}

/**
 * @name findPlugin
 * @description The plugin with this name from a config, or null when it is not listed.
 *
 * @example
 * const plugin = findPlugin(config, "alerts");
 * if (plugin) plugin.channels.map((channel) => channel.name);
 */
export function findPlugin<Name extends PluginName>(
  config: AnalyticsConfig,
  name: Name,
): Nullable<Extract<ServerPlugin, { name: Name }>> {
  return (
    config.plugins.find(
      (plugin): plugin is Extract<ServerPlugin, { name: Name }> => plugin.name === name,
    ) ?? null
  );
}
