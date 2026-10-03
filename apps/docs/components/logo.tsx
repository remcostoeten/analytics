type Props = {
  className?: string;
};

export function Logo({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-fd-foreground" />
      <path
        d="M6 16.5 10 10l3 4.5 5-7"
        className="stroke-fd-background"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
