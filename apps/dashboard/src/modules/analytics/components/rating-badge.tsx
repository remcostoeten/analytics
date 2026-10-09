import type { VitalRating } from "@spoar/contract";

import { ratingLabels } from "../speed";

type Props = { rating: VitalRating | null };

export function RatingBadge({ rating }: Props) {
  if (rating === null) return <span className="rating rating-none">Too few samples</span>;
  return <span className={`rating rating-${rating}`}>{ratingLabels[rating]}</span>;
}
