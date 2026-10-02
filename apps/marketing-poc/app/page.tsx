import Link from "next/link";

const landings = [
  {
    href: "/stackly",
    name: "Stackly · variant A",
    note: "Reference replica: dark, orange accent, live task board hero.",
  },
  {
    href: "/terminal",
    name: "Stackly · variant B",
    note: "Editorial brutalist: typing terminal, crosshair cursor, scroll-driven board, ledger index.",
  },
] as const;

export default function Page() {
  return (
    <main className="frame mx-auto my-12 flex max-w-2xl flex-col px-8 py-16">
      <p className="eyebrow text-fog">Marketing POC</p>
      <h1 className="font-display mt-3 text-4xl">Landing pages under test</h1>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {landings.map((landing) => (
          <li key={landing.href}>
            <Link
              href={landing.href}
              className="flex items-baseline justify-between gap-6 py-5 hover:bg-ink-raised"
            >
              <span className="text-lg">{landing.name}</span>
              <span className="max-w-sm text-right text-sm text-fog">{landing.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
