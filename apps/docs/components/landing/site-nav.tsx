"use client";

import { useTheme } from "fumadocs-ui/provider/base";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { DropTrail } from "./drop-trail";
import { NavArtTile, type NavArt } from "./nav-art";

import { ArrowIcon, ChevronIcon, CloseIcon, MenuIcon, MoonIcon, SunIcon } from "./icons";

export type NavLink = {
  label: string;
  href: string;
  description: string;
  art: NavArt;
};

export type NavGroup = {
  title: string;
  links: NavLink[];
};

type Props = {
  groups: NavGroup[];
  loginHref: string;
};

const menuItem =
  "nav-item flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-fg/5 focus-visible:bg-fg/5 focus-visible:outline-none";

const headerLogoShape = {
  width: 1.1,
  fullness: 0.13,
  lean: -0.16,
  thickness: 0.8,
  fold: 2,
};

export function SiteNav({ groups, loginHref }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <nav ref={root} className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div className="relative">
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-[0_6px_24px_-12px_rgb(var(--shade)/0.25)] backdrop-blur-md">
          <Link
            href="/"
            aria-label="Spoar home"
            className="mr-6 flex items-center gap-2 rounded-full py-1 pr-2 pl-1.5 text-[0.85rem] font-medium tracking-tight text-fg"
          >
            <DropTrail
              size={36}
              shape={headerLogoShape}
              scrollDriven
              color="#a18acb"
              metalness={0.3}
              roughness={0.32}
              clearcoat={0.35}
            />
            Spoar
          </Link>
          <button
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close docs menu" : "Open docs menu"}
            onClick={() => setOpen((value) => !value)}
            className="pill-ghost nav-toggle order-last gap-1 max-sm:size-8 max-sm:px-0! sm:order-none"
          >
            <span className="max-sm:hidden">Docs</span>
            <ChevronIcon className="nav-chevron size-3.5 max-sm:hidden" />
            <span className="contents sm:hidden">
              <span className="nav-toggle-icons" aria-hidden="true">
                <MenuIcon className="nav-menu-icon size-4" />
                <CloseIcon className="nav-close-icon size-4" />
              </span>
            </span>
          </button>
          <a href={loginHref} className="pill-login">
            Log in
            <span className="pill-login-icon" aria-hidden="true">
              <ArrowIcon className="size-3" />
            </span>
          </a>
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="pill-ghost theme-toggle size-8 px-0!"
          >
            <MoonIcon className="theme-moon size-4" />
            <SunIcon className="theme-sun size-4" />
          </button>
        </div>
        {open ? (
          <div
            id={menuId}
            className="nav-popover animate-menu-in absolute inset-x-0 top-[calc(100%+8px)] grid gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgb(var(--shade)/0.35)] max-sm:max-h-[calc(100dvh-5rem)] max-sm:overflow-y-auto sm:right-auto sm:left-1/2 sm:-ml-[18.5rem] sm:w-[37rem] sm:grid-cols-2"
          >
            {groups.map((group) => (
              <section key={group.title} className="p-1">
                <h2 className="px-3 pt-2 pb-1 text-[0.65rem] font-medium tracking-[0.08em] text-muted uppercase">
                  {group.title}
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} onClick={() => setOpen(false)} className={menuItem}>
                        <NavArtTile art={link.art} />
                        <span className="min-w-0">
                          <span className="block text-[0.85rem] text-fg">{link.label}</span>
                          <span className="block text-[0.75rem] leading-snug text-muted">
                            {link.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
