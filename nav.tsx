"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, Coins, RefreshCw } from "lucide-react";
import { C, fontSans, fontMono } from "./ui";

export function Header({ onRefresh, checking, label }: { onRefresh: () => void; checking: boolean; label: string }) {
  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 10, background: C.bgHeader,
        borderBottom: `1px solid ${C.border}`, padding: "14px 16px 10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: fontSans, fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: 0.2 }}>
            Global Market Intelligence
          </div>
          <div style={{ fontFamily: fontSans, fontSize: 10.5, color: C.gold, marginTop: 2 }}>{label}</div>
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: "flex", alignItems: "center", gap: 5, background: "transparent",
            border: `1px solid ${C.borderStrong}`, borderRadius: 7, padding: "6px 9px",
            color: C.textMuted, fontFamily: fontSans, fontSize: 11, cursor: "pointer",
          }}
        >
          <RefreshCw size={12} className={checking ? "spin" : ""} />
          {checking ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "HOME", icon: Home },
    { href: "/nifty", label: "NIFTY", icon: LineChart },
    { href: "/btc", label: "BTC", icon: Coins },
  ];
  return (
    <div
      style={{
        position: "sticky", bottom: 0, display: "flex", background: C.bgHeader,
        borderTop: `1px solid ${C.border}`, padding: "8px 0 10px",
      }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              textDecoration: "none", color: active ? C.gold : C.textFaint,
            }}
          >
            <Icon size={19} />
            <span style={{ fontFamily: fontMono, fontSize: 9.5, letterSpacing: 0.5 }}>{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
