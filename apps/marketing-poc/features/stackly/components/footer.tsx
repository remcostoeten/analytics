import { footerColumns } from "../content";
import { Logo } from "./primitives";

export function Footer() {
  return (
    <footer className="border-t border-line-strong px-8">
      <div className="mx-auto grid max-w-[1180px] gap-10 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-fog">
            One system for planning, tracking, and shipping.
          </p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title}>
            <p className="eyebrow text-paper">{column.title}</p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link}>
                  <button type="button" className="text-sm text-fog hover:text-paper">
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="eyebrow mx-auto max-w-[1180px] border-t border-line py-5 text-fog">
        Stackly · Marketing POC · Not a real product
      </p>
    </footer>
  );
}
