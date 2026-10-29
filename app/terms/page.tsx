import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalDoc, LegalSection } from "@/components/legal-doc";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description:
    "Terms for using the FirstPR website and the FirstPRbot GitHub App, including acceptable use and the AGPL-3.0 license.",
  path: "/terms",
});

const TOC = [
  { id: "accept", label: "Acceptance" },
  { id: "service", label: "The service" },
  { id: "use", label: "Acceptable use" },
  { id: "github", label: "GitHub’s terms" },
  { id: "content", label: "Your content" },
  { id: "license", label: "Software license" },
  { id: "warranty", label: "No warranty" },
  { id: "liability", label: "Liability" },
  { id: "end", label: "Termination" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalDoc title="Terms" toc={TOC}>
      <LegalSection id="accept" title="Acceptance">
        <p>
          These terms cover the FirstPR website and FirstPRbot as shipped in this repository, operated by Nishal K and Anan Shaji (NKcodex / DuoMatter), India. Using the site or installing the bot means you accept them. If you run your own copy, you are the operator of that copy.
        </p>
      </LegalSection>
      <LegalSection id="service" title="The service">
        <p>
          FirstPR matches public beginner issues, explains where to look, and scores a pull request or a diff you paste. FirstPR does not write your code, does not commit it, and does not open or merge a pull request for you. Hints are written to refuse requests for a ready-made patch. A score is a checklist, not a maintainer’s decision.
        </p>
        <p>
          Output can be wrong. Line citations are checked against the file when that check runs, and dropped when they do not match. That check is not a promise that every sentence is correct.
        </p>
      </LegalSection>
      <LegalSection id="use" title="Acceptable use">
        <p>
          Do not use the site or the bot to abuse GitHub’s API, to attack a repository, or to submit someone else’s private material. Public repositories only. You are responsible for the pull request you open.
        </p>
      </LegalSection>
      <LegalSection id="github" title="GitHub’s terms">
        <p>
          GitHub data is fetched with GitHub’s API. FirstPRbot uses GitHub App webhooks and posts comments. GitHub’s terms and the permissions you grant the app also apply. This project does not replace them.
        </p>
      </LegalSection>
      <LegalSection id="content" title="Your content">
        <p>
          Issue text, pull request text, and diffs you submit stay yours. You give the operator permission to send that text to the processors listed on the privacy page solely to run match, explain, hints, difficulty, review, and bot comments. You are responsible for what you paste and for what you later push to GitHub.
        </p>
      </LegalSection>
      <LegalSection id="license" title="Software license">
        <p>
          The source code is AGPL-3.0, copyright 2026 Nishal K and Anan Shaji (NKcodex / DuoMatter). These site terms do not replace that license. A separate commercial license, for use without AGPL source-disclosure duties, is not included in the repository. Ask nishal@nishal.dev. The README states that offer. These terms do not grant that commercial license by themselves.
        </p>
      </LegalSection>
      <LegalSection id="warranty" title="No warranty">
        <p>
          The site and the bot are provided as available. There is no warranty of accuracy, uptime, or fitness for a particular placement, job, or merge. Models and GitHub rate limits fail. The in-memory cache can disappear when the process restarts.
        </p>
      </LegalSection>
      <LegalSection id="liability" title="Liability">
        <p>
          To the extent the law allows, Nishal K and Anan Shaji are not liable for lost work, a rejected pull request, or a wrong explanation. Nothing here limits liability that the law does not let us limit.
        </p>
      </LegalSection>
      <LegalSection id="end" title="Termination">
        <p>
          You stop using the site by leaving it and, if you installed the bot, by uninstalling the GitHub App. We may stop the public deployment. Self-hosted copies are yours to shut down.
        </p>
      </LegalSection>
      <LegalSection id="law" title="Governing law">
        <p>These terms are governed by the laws of India. Courts in Kerala have jurisdiction, except where a statute gives you a different forum you cannot waive.</p>
      </LegalSection>
      <LegalSection id="changes" title="Changes">
        <p>If these terms change, the date at the top changes. Continued use of the public site after that date is acceptance of the new text.</p>
      </LegalSection>
      <LegalSection id="contact" title="Contact">
        <p>Nishal K and Anan Shaji (NKcodex / DuoMatter), India. Email nishal@nishal.dev.</p>
      </LegalSection>
    </LegalDoc>
  );
}
