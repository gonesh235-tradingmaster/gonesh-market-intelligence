import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { BottomNav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Global Market Intelligence",
  description: "NIFTY 50 and BTC market intelligence — not a trading-signal generator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            maxWidth: 480, margin: "0 auto", minHeight: "100vh",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
