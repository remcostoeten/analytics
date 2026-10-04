import type { WireEvent } from "@spoar/contract";

import type { BeforeSend, ConsentStatus, Hooks, Plugin, PluginClient } from "./types";

export type PluginHost = Hooks & {
  use: (plugin: Plugin, client: PluginClient) => () => void;
  apply: (event: WireEvent) => WireEvent | null;
  page: () => void;
  hidden: () => void;
  consent: (status: ConsentStatus) => void;
  stop: () => void;
};

function list<Item>() {
  const items: Item[] = [];
  return {
    items,
    add: (item: Item) => {
      items.push(item);
      return () => {
        const at = items.indexOf(item);
        if (at !== -1) items.splice(at, 1);
      };
    },
  };
}

function each<Value>(runs: ((value: Value) => void)[], value: Value) {
  for (const run of runs.slice()) run(value);
}

/**
 * @name definePlugin
 * @description Declares a plugin: a name and a `setup` that receives the client with its hooks
 * (`beforeSend`, `onPage`, `onHidden`, `onConsent`) and returns its cleanup.
 *
 * @example
 * const hello = definePlugin({ name: "hello", setup: (client) => client.onPage(() => client.track("hello")) });
 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

/**
 * @name createPluginHost
 * @description Runs plugins and their hooks. `beforeSend` functions run in registration order and
 * any of them can drop an event by returning null.
 *
 * @example
 * const host = createPluginHost();
 * const remove = host.use(plugin, client);
 */
export function createPluginHost(): PluginHost {
  const filters = list<BeforeSend>();
  const pages = list<() => void>();
  const hides = list<() => void>();
  const consents = list<(status: ConsentStatus) => void>();
  const cleanups = new Map<Plugin, () => void>();

  function use(plugin: Plugin, client: PluginClient) {
    cleanups.get(plugin)?.();
    cleanups.set(plugin, plugin.setup(client));
    return () => {
      cleanups.get(plugin)?.();
      cleanups.delete(plugin);
    };
  }

  function apply(event: WireEvent) {
    let current: WireEvent | null = event;
    for (const filter of filters.items) {
      if (!current) break;
      current = filter(current);
    }
    return current;
  }

  return {
    use,
    apply,
    beforeSend: filters.add,
    onPage: pages.add,
    onHidden: hides.add,
    onConsent: consents.add,
    page: () => each(pages.items, undefined),
    hidden: () => each(hides.items, undefined),
    consent: (status) => each(consents.items, status),
    stop: () => {
      for (const cleanup of cleanups.values()) cleanup();
      cleanups.clear();
    },
  };
}
