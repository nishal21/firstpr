import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Privacy · FirstPR",
  description: "What FirstPR collects, where it is processed, and how long it is kept.",
};

const TOC = [
  { id: "who", label: "Who operates FirstPR" },
  { id: "what", label: "What is collected" },
  { id: "why", label: "Why" },
  { id: "where", label: "Where it is processed" },
  { id: "third", label: "Third parties" },
  { id: "retention", label: "Retention" },
  { id: "rights", label: "Your rights" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy" toc={TOC}>
      <LegalSection id="who" title="Who operates FirstPR">
        <p>
          FirstPR is operated by Nishal K and Anan Shaji (NKcodex / DuoMatter), based in India. Contact nishal@nishal.dev. The public site in this project is hosted at firstpr-coral.vercel.app. A self-hosted copy is operated by whoever runs that copy.
        </p>
      </LegalSection>
      <LegalSection id="what" title="What is collected">
        <p>There is no account and no login. This repository does not set cookies and does not include a product analytics SDK.</p>
        <p>In the browser, the site stores:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Recent search strings, up to five, under the key firstpr-recent-searches.</li>
          <li>The UI language under firstpr-ui-lang, and the older key firstpr-lang if it was set before.</li>
          <li>The colour theme under the key theme, written by the theme library.</li>
        </ul>
        <p>
          On the server, a request can include a GitHub username, a repository name, an issue number, a pull request URL, or a diff you paste. Explain, hints, difficulty, and review send the issue or pull request text the feature needs (title, body, file paths, short file previews, and the diff or patch) to the model configured for that task.
        </p>
        <p>
          FirstPRbot, when installed, receives GitHub webhook payloads for issue comments and for pull requests that are opened or updated. Those payloads include the repository, the issue or pull request number, the comment text, and the sender login GitHub provides. The app posts a comment back on that issue or pull request.
        </p>
      </LegalSection>
      <LegalSection id="why" title="Why">
        <p>
          The data is used to match public beginner issues, explain an issue, score a pull request, and, if the GitHub App is installed, post that same guide or score on GitHub. Search suggestions call GitHub’s public search. Recent searches and language and theme stay on your device so the page can remember them.
        </p>
      </LegalSection>
      <LegalSection id="where" title="Where it is processed">
        <p>
          The site code runs on the host you deploy it to. The deployment described in this repo is Vercel. GitHub API calls are made from the server with a token that is not sent to the browser. Model calls are made from the server.
        </p>
        <p>
          There is no database in this code. A README note about Neon Postgres is not implemented: nothing reads DATABASE_URL.
        </p>
      </LegalSection>
      <LegalSection id="third" title="Third parties">
        <p>Named only where the code calls them:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>GitHub, for public repository, issue, and pull request data, and for FirstPRbot webhooks and comments.</li>
          <li>OpenAI, at api.openai.com unless OPENAI_BASE_URL is set to another host. Explain, hints, review, difficulty, and the file-pick fallback send the text those tasks need. Logs record the task name, model name, token counts, and duration, not the prompt.</li>
          <li>Neysa Gemma and Neysa Qwen, only if those keys and URLs are set. They are asked to pick files from path lists and short previews.</li>
          <li>SerpAPI’s Google search, only if SERPAPI_KEY is set. The query is a short topic derived from the issue, not your GitHub password or token.</li>
          <li>Vercel, as the host of the public deployment. This repo does not install Vercel Analytics.</li>
        </ul>
      </LegalSection>
      <LegalSection id="retention" title="Retention">
        <p>
          The server cache is an in-memory map. The default lifetime is ten minutes, and the map is discarded when the process stops. This code does not set a retention period for host logs. Console logs can include webhook event names, repository coordinates, error messages, and model token counts. Demo JSON files under data/demo are written only when RECORD_DEMO=1 and the process is not production.
        </p>
        <p>Browser storage stays until you clear it. Recent searches hold at most five strings. You can clear them from the search menu.</p>
      </LegalSection>
      <LegalSection id="rights" title="Your rights">
        <p>
          Because there is no account, there is no profile stored for us to export. You can delete the browser keys above in your browser. For a copy of a comment FirstPRbot posted, use GitHub. To ask about server logs or a self-hosted copy, email nishal@nishal.dev.
        </p>
        <p>
          If the Digital Personal Data Protection Act, 2023 applies, you may ask the operator to access, correct, or erase personal data they hold, and to nominate someone to exercise those rights, to the extent the data exists. If the GDPR applies, the same request covers access, correction, erasure, restriction, and objection where those rights fit a stateless service. We do not sell personal data. There is no automated decision that opens a pull request or rejects one; the score is a checklist shown to you or posted as a comment.
        </p>
      </LegalSection>
      <LegalSection id="children" title="Children">
        <p>The app is not aimed at children and does not ask for age. Do not send a child’s personal data in an issue or pull request body.</p>
      </LegalSection>
      <LegalSection id="changes" title="Changes">
        <p>If this page changes, the date at the top changes with it. The page describes this repository as of that date.</p>
      </LegalSection>
      <LegalSection id="contact" title="Contact">
        <p>Nishal K and Anan Shaji (NKcodex / DuoMatter), India. Email nishal@nishal.dev.</p>
      </LegalSection>
    </LegalDoc>
  );
}
