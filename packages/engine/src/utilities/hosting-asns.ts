const hostingAsns = new Map<number, string>([
  [16509, "Amazon AWS"],
  [14618, "Amazon AWS"],
  [8987, "Amazon AWS"],
  [15169, "Google"],
  [396982, "Google Cloud"],
  [8075, "Microsoft Azure"],
  [24940, "Hetzner"],
  [213230, "Hetzner Cloud"],
  [16276, "OVH"],
  [14061, "DigitalOcean"],
  [63949, "Akamai Linode"],
  [20473, "Vultr"],
  [31898, "Oracle Cloud"],
  [45102, "Alibaba Cloud"],
  [132203, "Tencent Cloud"],
  [12876, "Scaleway"],
  [51167, "Contabo"],
  [9009, "M247"],
  [60068, "Datacamp"],
  [212238, "Datacamp"],
]);

/**
 * @name hostingProvider
 * @description The hosting provider an autonomous system belongs to, or null for networks that
 * are not in the list: AWS, Google Cloud, Azure, Hetzner, OVH, DigitalOcean, Linode, Vultr,
 * Oracle, Alibaba, Tencent, Scaleway, Contabo, M247 and Datacamp.
 *
 * @example
 * hostingProvider(24940); // "Hetzner"
 */
export function hostingProvider(asn: number | null | undefined): string | null {
  return asn ? (hostingAsns.get(asn) ?? null) : null;
}
