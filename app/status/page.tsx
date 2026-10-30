import type { Metadata } from "next";
import { StatusBoard } from "@/components/status-board";
import { pageMetadata } from "@/lib/seo";
import { getStatusReport } from "@/lib/status-checks";

export const revalidate = 60;
export const maxDuration = 30;

export const metadata: Metadata = pageMetadata({
  title: "Status",
  description:
    "Live checks for FirstPR: the website, the API, GitHub, issue search, the FirstPRbot webhook, and the daily search sync.",
  path: "/status",
});

export default async function StatusPage() {
  const report = await getStatusReport();
  return <StatusBoard initial={report} />;
}
