import { ticker } from "../content";

export function Ticker() {
  const items = [...ticker, ...ticker];
  return (
    <div className="overflow-hidden border-b border-[#2a2a2e] bg-[#d8ff3a] py-2 text-[#070708]">
      <div className="marquee flex w-max gap-12 whitespace-nowrap">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="mono text-[11px] tracking-[0.2em] uppercase">
            {item} <span className="mx-6 opacity-50">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
