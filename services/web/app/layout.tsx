import type { ReactNode } from "react";
import type { Viewport, Metadata } from "next";

import "./globals.css";

const metadataBase = new URL("https://craigwatt.github.io/meops/");

export const metadata: Metadata = {
  metadataBase,
  title: "meops — turn work into signal",
  description:
    "A personal operations system that watches your GitHub repos and turns engineering activity into publishable drafts for X and LinkedIn.",
  icons: {
    icon: "favicon.jpg",
    apple: "apple-touch-icon.jpg"
  },
  openGraph: {
    title: "meops — turn work into signal",
    description:
      "Watches repository activity, extracts meaningful moments, and prepares publishable drafts without constant attention.",
    type: "website",
    images: [{ url: "og-image.jpg", width: 1024, height: 1024, alt: "meops social preview" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "meops — turn work into signal",
    description:
      "Watches repository activity, extracts meaningful moments, and prepares publishable drafts without constant attention.",
    images: ["og-image.jpg"]
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
