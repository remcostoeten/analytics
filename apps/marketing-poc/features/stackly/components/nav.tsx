"use client";

import { useEffect, useState } from "react";

import { navLinks, navSteps } from "../content";
import { Button, Logo } from "./primitives";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      setScrolled(window.scrollY > 24);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function jump(step: (typeof navSteps)[number]) {
    setActiveStep(step.label);
    document.getElementById(step.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-[scrolled=true]:border-line data-[scrolled=true]:bg-ink/80 data-[scrolled=true]:backdrop-blur-md"
    >
      <div className="flex items-center gap-10 px-8 py-4">
        <Logo />
        <nav className="hidden items-stretch gap-1 lg:flex">
          {navSteps.map((step) => (
            <button
              type="button"
              key={step.label}
              data-active={activeStep === step.label}
              onClick={() => jump(step)}
              className="tab tab-fade eyebrow flex w-40 items-center justify-between px-3 py-2 text-mist hover:text-paper data-[active=true]:text-ember"
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
              className="link eyebrow flex items-center gap-1.5 border-l border-line px-4 whitespace-nowrap text-mist first:border-l-0 hover:text-paper"
            >
              <span className="link-text">{link.label}</span>
              {link.badge ? (
                <span className="bg-ember px-1 py-px text-[9px] text-ink transition-transform hover:scale-110">
                  {link.badge}
                </span>
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
