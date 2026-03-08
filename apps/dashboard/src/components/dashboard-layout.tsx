"use client";

import { ReactNode, useState } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-primary-foreground"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold">Remco Analytics</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="/"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Dashboard
              </a>
              <a
                href="https://github.com/remcostoeten/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                GitHub
              </a>
              <a
                href="https://npmjs.com/package/@remcostoeten/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                npm
              </a>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pt-4 pb-2 border-t mt-4">
              <div className="flex flex-col space-y-3">
                <a
                  href="/"
                  className="text-sm font-medium transition-colors hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </a>
                <a
                  href="https://github.com/remcostoeten/analytics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  GitHub
                </a>
                <a
                  href="https://npmjs.com/package/@remcostoeten/analytics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  npm
                </a>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
            <p>
              Built with ❤️ by{" "}
              <a
                href="https://github.com/remcostoeten"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary transition-colors"
              >
                Remco Stoeten
              </a>
            </p>
            <p>MIT License</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
