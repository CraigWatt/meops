import type { ReactNode } from "react";
import type { Viewport, Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "meops — turn work into signal",
  description:
    "A personal operations system that watches your GitHub repos and turns engineering activity into publishable drafts for X and LinkedIn.",
  openGraph: {
    title: "meops — turn work into signal",
    description:
      "Watches repository activity, extracts meaningful moments, and prepares publishable drafts without constant attention.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ background: "#0a0a0b" }}>
      <body>{children}</body>
    </html>
  );
}
