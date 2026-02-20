import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { DashboardLayout } from "@/components/dashboard-layout";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const metadata: Metadata = {
  title: "Remco Analytics - Privacy-focused Analytics Dashboard",
  description: "Privacy-first analytics platform with cookie-free tracking, GDPR compliance, and real-time insights",
  keywords: ["analytics", "privacy", "gdpr", "tracking", "dashboard"],
  authors: [{ name: "Remco Stoeten" }],
  openGraph: {
    title: "Remco Analytics",
    description: "Privacy-focused analytics dashboard",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
			  <NuqsAdapter>
				  <DashboardLayout>{children}</DashboardLayout>
					</NuqsAdapter>
			  </body>
    </html>
  );
}
