type Props = { height: number };

export function SectionSkeleton({ height }: Props) {
  return (
    <div className="panel-section" aria-hidden="true">
      <div className="skeleton" style={{ height }} />
    </div>
  );
}
