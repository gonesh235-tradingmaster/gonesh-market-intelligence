"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { MoodFactor, Freshness } from "@/lib/types";
import { moodLabel } from "@/lib/scoring";

export const C = {
  bg: "#0B0E13",
  bgHeader: "#0E1219",
  card: "#141922",
  cardAlt: "#10141B",
  border: "#232A35",
  borderStrong: "#323B49",
  text: "#E7EAEE",
  textMuted: "#8B94A3",
  textFaint: "#5C6472",
  gold: "#C9A445",
  green: "#34C787",
  red: "#EA5C5C",
  amber: "#DDA53F",
};

export const fontMono =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const fontSans =
  "'IBM Plex Sans', -apple-system, 'Segoe UI', Inter, system-ui, sans-serif";

export function moodColor(score: number): string {
  if (score >= 30) return C.green;
  if (score >= -29) return C.amber;
  return C.red;
}

export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const map: Record<Freshness, string> = {
    LIVE: C.green,
    "~1 MIN DELAY": C.green,
    "LATEST AVAILABLE": C.amber,
    STALE: C.textFaint,
    "DATA UNAVAILABLE": C.red,
  };
  const color = map[freshness] || C.textMuted;
  return (
    <span
      style={{
        fontFamily: fontMono, fontSize: 10, letterSpacing: 0.4, color,
        border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {freshness}
    </span>
  );
}

export function DirIcon({ dir, size = 15 }: { dir: string; size?: number }) {
  if (dir === "positive") return <TrendingUp size={size} color={C.green} />;
  if (dir === "negative") return <TrendingDown size={size} color={C.red} />;
  return <Minus size={size} color={C.textMuted} />;
}

export function ScoreMeter({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const color = moodColor(score);
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          position: "relative", height: 6, borderRadius: 3, marginTop: 8, marginBottom: 4,
          background: `linear-gradient(90deg, ${C.red} 0%, ${C.amber} 50%, ${C.green} 100%)`,
          opacity: 0.35,
        }}
      >
        <div
          style={{
            position: "absolute", top: -3, left: `calc(${pct}% - 6px)`,
            width: 12, height: 12, borderRadius: "50%", background: color,
            border: `2px solid ${C.bg}`, boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fontMono, fontSize: 9, color: C.textFaint }}>
        <span>-100</span><span>0</span><span>+100</span>
      </div>
    </div>
  );
}

export function Card({ children, onClick, alt }: { children: React.ReactNode; onClick?: () => void; alt?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: alt ? C.cardAlt : C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: 14, marginBottom: 10, cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ margin: "18px 2px 8px" }}>
      <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.text }}>{children}</div>
      {sub && <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function FieldLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontFamily: fontSans, fontSize: 10.5, color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}: </span>
      <span style={{ fontFamily: fontSans, fontSize: 12, color: C.textMuted }}>{value}</span>
    </div>
  );
}

export function FactorRow({ f }: { f: MoodFactor }) {
  const [open, setOpen] = useState(false);

  if (f.unavailable) {
    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: fontSans, fontSize: 13, color: C.textMuted }}>{f.name}</span>
          <FreshnessBadge freshness="DATA UNAVAILABLE" />
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.textFaint, marginTop: 6 }}>{f.why || f.evidence}</div>
      </Card>
    );
  }

  return (
    <Card onClick={() => setOpen(!open)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <DirIcon dir={f.direction} />
          <span style={{ fontFamily: fontSans, fontSize: 13, color: C.text, fontWeight: 500 }}>{f.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: fontMono, fontSize: 12, color: f.score > 0 ? C.green : f.score < 0 ? C.red : C.textMuted }}>
            {f.score > 0 ? "+" : ""}{f.score}
          </span>
          {open ? <ChevronUp size={15} color={C.textFaint} /> : <ChevronDown size={15} color={C.textFaint} />}
        </div>
      </div>
      <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>{f.why}</div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          <FieldLine label="Evidence" value={f.evidence} />
          <FieldLine label="Impact" value={f.impact} />
          {f.stale && (
            <div style={{ fontFamily: fontSans, fontSize: 10.5, color: C.amber, marginBottom: 6 }}>
              Real data, too old to treat as current — excluded from the score below.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontFamily: fontSans, fontSize: 10.5, color: C.textFaint }}>
              {f.source} · {f.timestamp ? new Date(f.timestamp).toLocaleString() : "—"} · weight {f.weight}%{f.stale ? " (excluded)" : ""}
            </span>
            <FreshnessBadge freshness={f.freshness} />
          </div>
        </div>
      )}
    </Card>
  );
}

export function MoodBlock({ title, score, explain }: { title: string; score: number; explain: string }) {
  const label = moodLabel(score);
  const color = moodColor(score);
  return (
    <Card alt>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: fontSans, fontSize: 12.5, color: C.textMuted }}>{title}</span>
        <span style={{ fontFamily: fontMono, fontSize: 22, color, fontWeight: 600 }}>{score > 0 ? "+" : ""}{score}</span>
      </div>
      <div style={{ fontFamily: fontSans, fontSize: 12, fontWeight: 600, color, letterSpacing: 0.3, marginTop: 2 }}>{label}</div>
      <ScoreMeter score={score} />
      <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{explain}</div>
    </Card>
  );
}

export function KeyLevel({ label, value, unavailable }: { label: string; value?: string; unavailable?: boolean }) {
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", flex: "1 1 45%", minWidth: 130 }}>
      <div style={{ fontFamily: fontSans, fontSize: 10.5, color: C.textFaint }}>{label}</div>
      {unavailable ? (
        <div style={{ fontFamily: fontMono, fontSize: 12, color: C.red, marginTop: 3 }}>DATA UNAVAILABLE</div>
      ) : (
        <div style={{ fontFamily: fontMono, fontSize: 15, color: C.text, marginTop: 3 }}>{value}</div>
      )}
    </div>
  );
}
