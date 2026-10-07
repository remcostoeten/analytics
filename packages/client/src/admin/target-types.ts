import type { AlertEventName } from "@spoar/contract";

export type Email = `${string}@${string}.${string}`;

export type HttpsUrl = `https://${string}`;

export type Recipients = [Email, ...Email[]];

export type Subscription = [AlertEventName, ...AlertEventName[]];

type TargetOptions<Name extends string> = {
  name?: Name;
  on?: Subscription;
  enabled?: boolean;
};

export type MailTarget<Name extends string = string> = TargetOptions<Name> & {
  channel: "mail";
  to: Recipients;
};

export type WebhookTarget<Name extends string = string> = TargetOptions<Name> & {
  channel: "webhook";
  url: HttpsUrl;
};

export type DiscordTarget<Name extends string = string> = TargetOptions<Name> & {
  channel: "discord";
  url: HttpsUrl;
};

export type Target<Name extends string = string> =
  | MailTarget<Name>
  | WebhookTarget<Name>
  | DiscordTarget<Name>;

export type MailOptions = Omit<MailTarget, "channel" | "name">;

export type UrlOptions = Omit<WebhookTarget, "channel" | "name">;

type TargetKey<Item> = Item extends { name?: infer Name extends string } ? Name : never;

type Duplicates<
  Targets extends readonly Target[],
  Seen extends string = never,
> = Targets extends readonly [infer Head extends Target, ...infer Rest extends readonly Target[]]
  ? string extends TargetKey<Head>
    ? Duplicates<Rest, Seen>
    : TargetKey<Head> extends Seen
      ? TargetKey<Head> | Duplicates<Rest, Seen>
      : Duplicates<Rest, Seen | TargetKey<Head>>
  : never;

export type UniqueNames<Targets extends readonly Target[]> = [Duplicates<Targets>] extends [never]
  ? Targets
  : Targets & { "each target needs its own name": Duplicates<Targets> };
