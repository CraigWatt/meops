import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "meops",
  description: "Turn work into signal"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

