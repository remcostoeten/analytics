import { navLinks, navSteps } from "../content";
import { Button, Logo } from "./primitives";

export function Nav() {
  return (
    <header className="relative z-10">
      <div className="flex items-center gap-10 px-8 py-5">
        <Logo />
        <nav className="hidden items-stretch gap-1 lg:flex">
          {navSteps.map((step) => (
            <button
              type="button"
              key={step.label}
              className="tab tab-fade eyebrow flex w-40 items-center justify-between px-3 py-2 text-mist hover:text-paper"
            >
              <span>{step.label}</span>
              <span className="text-fog/70">{step.index}</span>
            </button>
          ))}
        </nav>
        <nav className="ml-auto hidden items-center md:flex">
          {navLinks.map((link) => (
            <button
              type="button"
              key={link.label}
              className="eyebrow flex items-center gap-1.5 border-l border-line px-4 whitespace-nowrap text-mist first:border-l-0 hover:text-paper"
            >
              {link.label}
              {link.badge ? (
                <span className="bg-ember px-1 py-px text-[9px] text-ink">{link.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button tone="dark" small>
            Book a call
          </Button>
          <Button tone="dark" small arrow>
            Start training
          </Button>
        </div>
      </div>
    </header>
  );
}
