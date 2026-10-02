import type { WireGroups } from "@remcostoeten/analytics-contract";
import { groupTypePattern, maxGroupId, maxGroups } from "@remcostoeten/analytics-contract/limits";
import { hasKeys } from "@remcostoeten/analytics-shared/records";

import { definePlugin } from "../core/plugin-host";
import type { GroupMap, GroupTraits, GroupType, Plugin, PluginClient, Props } from "../core/types";

export type TraitsArgs<Map extends GroupMap, Type extends GroupType<Map>> = [
  keyof Map[Type],
] extends [never]
  ? []
  : [traits?: GroupTraits<Map, Type>];

export type Groups<Map extends GroupMap = GroupMap> = Plugin & {
  set: <Type extends GroupType<Map>>(
    type: Type,
    id: string,
    ...traits: TraitsArgs<Map, Type>
  ) => void;
  leave: (type: GroupType<Map>) => void;
};

const typePattern = new RegExp(groupTypePattern);

/**
 * @name groups
 * @description Puts events in groups, such as the company or workspace a signed-in person works
 * in, so reports can filter and break down by `group:<type>`. `set(type, id, traits?)` joins a
 * group and sends a `group` event with the traits; every later event carries all joined groups,
 * up to 5. Groups belong to the visitor that joined them: after `reset()`, consent being revoked
 * or `leave(type)`, events carry them no more. Groups live in memory, so set them on every page
 * load, where the signed-in user is known.
 *
 * @example
 * const workspace = groups<{ company: { plan: "free" | "pro" } }>();
 * createAnalytics({ ...config, plugins: [workspace] });
 * workspace.set("company", "acme", { plan: "pro" });
 */
export function groups<Map extends GroupMap = GroupMap>(): Groups<Map> {
  let members: WireGroups = {};
  let owner: string | null = null;
  let client: PluginClient | null = null;
  let waiting: Props[] = [];

  function announce(props: Props) {
    if (client) client.track("group", props);
    else waiting.push(props);
  }

  function set<Type extends GroupType<Map>>(
    type: Type,
    id: string,
    ...traits: TraitsArgs<Map, Type>
  ) {
    const full = !(type in members) && Object.keys(members).length === maxGroups;
    if (!typePattern.test(type) || id.length === 0 || full) return;
    const groupId = id.slice(0, maxGroupId);
    members = { ...members, [type]: groupId };
    owner = null;
    announce({ ...traits[0], groupType: type, groupId });
  }

  function leave(type: GroupType<Map>) {
    members = Object.fromEntries(Object.entries(members).filter(([joined]) => joined !== type));
  }

  function forget() {
    members = {};
    owner = null;
  }

  const plugin = definePlugin({
    name: "groups",
    setup: (host) => {
      client = host;
      const removeHook = host.beforeSend((event) => {
        owner ??= event.visitor;
        if (owner !== event.visitor) forget();
        if (hasKeys(members)) event.groups = { ...members };
        return event;
      });
      const removeConsent = host.onConsent((status) => {
        if (status === "denied") forget();
      });
      const announced = waiting;
      waiting = [];
      for (const props of announced) host.track("group", props);
      return () => {
        removeHook();
        removeConsent();
        client = null;
      };
    },
  });

  return {
    ...plugin,
    set,
    leave,
  };
}
