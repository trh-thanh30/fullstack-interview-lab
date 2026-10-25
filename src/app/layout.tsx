import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/figtree";
import "@fontsource/instrument-serif";

import { publicEnv } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: publicEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description: "Không gian luyện phỏng vấn Fullstack với question bank và AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
