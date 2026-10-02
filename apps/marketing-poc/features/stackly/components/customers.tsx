import { customers } from "../content";

export function Customers() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="relative grid grid-cols-2 border border-line md:grid-cols-5">
        <span className="eyebrow absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border border-line bg-ink px-3 py-1 text-mist">
          Case study ›
        </span>
        {customers.map((customer) => (
          <button
            type="button"
            key={customer}
            className="flex h-20 items-center justify-center border-line font-display text-xl text-fog transition-colors not-last:border-r hover:text-paper max-md:nth-[2n]:border-r-0 max-md:not-nth-last-[-n+2]:border-b md:not-nth-last-[-n+5]:border-b md:nth-[5n]:border-r-0"
          >
            {customer}
          </button>
        ))}
      </div>
    </section>
  );
}
