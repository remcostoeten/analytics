import { navLinks, navSteps } from "../content";
import { Button, Logo } from "./primitives";

export function Nav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
        <Logo />
        <nav className="hidden items-stretch gap-px lg:flex">
          {navSteps.map((step) => (
            <button
              type="button"
              key={step.label}
              className="eyebrow flex w-36 items-center justify-between bg-ink-raised px-3 py-1.5 text-mist hover:text-paper"
            >
              <span>{step.label}</span>
              <span className="text-fog">{step.index}</span>
            </button>
          ))}
        </nav>
        <nav className="ml-auto hidden items-center gap-5 md:flex">
          {navLinks.map((link) => (
            <button
              type="button"
              key={link.label}
              className="eyebrow flex items-center gap-1.5 text-mist hover:text-paper"
            >
              {link.label}
              {link.badge ? (
                <span className="bg-ember px-1 text-[9px] text-ink">{link.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button tone="dark">Book a call</Button>
          <Button tone="dark" arrow>
            Start training
          </Button>
        </div>
      </div>
    </header>
  );
}
