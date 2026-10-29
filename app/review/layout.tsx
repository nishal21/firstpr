import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Review a pull request before a maintainer does",
  description:
    "Paste a GitHub pull request URL or a diff and FirstPR scores it against the linked issue, the repo's CONTRIBUTING.md, and the change, with questions a maintainer might ask.",
  path: "/review",
});

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
