"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Header } from "@/components/nav";
import { C, fontSans, fontMono, Card, SectionTitle, MoodBlock, FreshnessBadge, moodColor } from "@/components/ui";

interface GlobalData {
  score: number;
  niftyMoodScore: number;
  btcMoodScore: number;
  nifty: any;
  btc: any;
  fetchedAt: string;
}

export default function HomePage() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/global", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <>
      <Header onRefresh={load} checking={checking} label="Live — refreshes every 60s" />
      <div style={{ padding: 14, fontFamily: fontSans, color: C.text }}>
        {error && !data && (
          <Card>
            <div style={{ color: C.red, fontFamily: fontSans, fontSize: 12 }}>
              Couldn't load live data: {error}. Check your internet connection and that the server is running.
            </div>
          </Card>
        )}

        {!data && !error && (
          <Card>
            <div style={{ color: C.textMuted, fontFamily: fontSans, fontSize: 12 }}>Loading live data…</div>
          </Card>
        )}

        {data && (
          <>
            <SectionTitle sub="A weighted blend of the NIFTY and BTC mood scores below — not a separate invented number.">
              Global Market Mood
            </SectionTitle>
            <MoodBlock
              title="Global Risk Environment"
              score={data.score}
              explain={`50/50 blend of the NIFTY mood (${data.niftyMoodScore}) and the BTC mood (${data.btcMoodScore}). Open either tab for the full factor breakdown.`}
            />

            <SectionTitle>Markets</SectionTitle>
            <Link href="/nifty" style={{ textDecoration: "none" }}>
              <Card>
                <SnapshotRow label="NIFTY 50" snap={data.nifty} moodScore={data.niftyMoodScore} format={(v: number) => v.toLocaleString("en-IN")} prefix="" />
              </Card>
            </Link>
            <Link href="/btc" style={{ textDecoration: "none" }}>
              <Card>
                <SnapshotRow label="BTC / USD" snap={data.btc} moodScore={data.btcMoodScore} format={(v: number) => v.toLocaleString("en-US")} prefix="$" />
              </Card>
            </Link>

            <div
              style={{
                display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, padding: 12,
                background: "rgba(221,165,63,0.13)", border: `1px solid ${C.amber}44`, borderRadius: 8,
              }}
            >
              <AlertTriangle size={15} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: fontSans, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                This is a market-intelligence view, not a signal generator. Nothing here is a guaranteed prediction, support/resistance level, or buy/sell call.
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SnapshotRow({ label, snap, moodScore, format, prefix }: { label: string; snap: any; moodScore: number; format: (v: number) => string; prefix: string }) {
  if (!snap || snap.note) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
          <FreshnessBadge freshness="DATA UNAVAILABLE" />
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11, color: C.textFaint, marginTop: 6 }}>{snap?.note ?? "No data"}</div>
      </>
    );
  }
  const up = snap.changePct >= 0;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
        <FreshnessBadge freshness={snap.freshness} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
        <span style={{ fontFamily: fontMono, fontSize: 22, color: C.text }}>{prefix}{format(snap.value)}</span>
        <span style={{ fontFamily: fontMono, fontSize: 13, color: up ? C.green : C.red, display: "flex", alignItems: "center", gap: 2 }}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {snap.changePct > 0 ? "+" : ""}{snap.changePct}%
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <span style={{ fontFamily: fontSans, fontSize: 11, color: moodColor(moodScore) }}>score {moodScore}</span>
        <span style={{ fontFamily: fontSans, fontSize: 10.5, color: C.textFaint }}>
          {snap.timestamp ? new Date(snap.timestamp).toLocaleString() : "—"}
        </span>
      </div>
    </>
  );
}
