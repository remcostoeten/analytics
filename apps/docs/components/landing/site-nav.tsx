"use client";

import { useTheme } from "fumadocs-ui/provider/base";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Logo } from "@/components/logo";

import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from "./icons";

type NavLink = {
  label: string;
  href: string;
};

type Props = {
  links: NavLink[];
  loginHref: string;
};

export function SiteNav({ links, loginHref }: Props) {
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
            <Logo className="size-6" />
            Spoar
          </Link>
          <Link href="/docs" className="pill-ghost">
            Docs
          </Link>
          <a href={loginHref} className="pill-ghost">
            Log in
          </a>
          <Link href="/docs/getting-started/quick-start" className="pill-dark">
            Get started
          </Link>
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="pill-ghost theme-toggle size-8 px-0!"
          >
            <MoonIcon className="theme-moon size-4" />
            <SunIcon className="theme-sun size-4" />
          </button>
          <button
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="pill-ghost nav-toggle size-8 px-0!"
          >
            <span className="nav-toggle-icons" aria-hidden="true">
              <MenuIcon className="nav-menu-icon size-4" />
              <CloseIcon className="nav-close-icon size-4" />
            </span>
          </button>
        </div>
        {open ? (
          <ul
            id={menuId}
            className="nav-popover animate-menu-in absolute inset-x-0 top-[calc(100%+8px)] flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgb(var(--shade)/0.35)]"
          >
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-[0.85rem] text-fg transition-colors hover:bg-fg/5 focus-visible:bg-fg/5 focus-visible:outline-none"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}
