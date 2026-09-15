import { NextResponse } from "next/server";
import { getNiftyData } from "@/lib/nifty";

// Each upstream fetch uses cache: "no-store", and the client polls this
// route every 60s (see the page components) — that combination is what
// delivers the brief's "~60s auto-refresh" without a stale-cache layer
// to reason about.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getNiftyData();
  return NextResponse.json(data);
}
