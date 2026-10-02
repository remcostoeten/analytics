import { customers } from "../content";
import { Icon } from "./icons";

function Wordmark({ name, weight }: { name: string; weight: "bold" | "serif" | "wide" }) {
  const styles = {
    bold: "text-[20px] font-bold tracking-tight",
    serif: "font-display text-[24px] tracking-tight",
    wide: "text-[15px] font-medium tracking-[0.18em] uppercase",
  };
  return <span className={styles[weight]}>{name}</span>;
}

export function Customers() {
  return (
    <section className="px-8 pt-8 pb-24">
      <div className="relative mx-auto grid max-w-[1180px] grid-cols-2 border border-line-strong md:grid-cols-5">
        <span className="eyebrow absolute top-0 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 border border-line-strong bg-ink-panel px-3 py-1 text-mist">
          Case study
          <Icon name="arrow-ne" size={10} />
        </span>
        {customers.map((customer) => (
          <button
            type="button"
            key={customer.name}
            className="logo-cell flex h-[90px] items-center justify-center gap-2 border-line-strong text-fog/80 not-last:border-r max-md:nth-[2n]:border-r-0 max-md:not-nth-last-[-n+2]:border-b md:not-nth-last-[-n+5]:border-b md:nth-[5n]:border-r-0"
          >
            <span className="flex size-5 items-center justify-center rounded-[3px] bg-current/40">
              <span className="size-2 rounded-[1px] bg-ink" />
            </span>
            <Wordmark name={customer.name} weight={customer.weight} />
          </button>
        ))}
      </div>
    </section>
  );
}
