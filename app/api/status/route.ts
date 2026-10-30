import { NextResponse } from "next/server";
import { getStatusReport } from "@/lib/status-checks";

export const runtime = "nodejs";
// Checks run at most once a minute per region; everyone in between gets the cached answer.
export const revalidate = 60;
export const maxDuration = 30;

export async function GET() {
  const report = await getStatusReport();
  return NextResponse.json(report, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}