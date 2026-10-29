/**
 * Plain facts about FirstPR shared by metadata, JSON-LD, llms.txt, and the
 * home page copy. Keep every line here true; answer engines quote it.
 */

import { SITE_URL } from "./site-url";

export { SITE_URL };

export const SITE_NAME = "FirstPR";
export const REPO_URL = "https://github.com/nishal21/firstpr";
export const ORG_NAME = "NKcodex";
export const ORG_URL = "https://nishal.dev";
export const CONTACT_EMAIL = "nishal@nishal.dev";
export const LICENSE = "AGPL-3.0-or-later";
export const LICENSE_URL = "https://www.gnu.org/licenses/agpl-3.0.html";
export const MAKERS = ["Nishal K", "Anan Shaji"] as const;

export const SITE_TAGLINE = "Find, understand, and review your first open-source pull request.";

export const SITE_DESCRIPTION =
  "FirstPR finds open good-first issues on public GitHub repos, explains which real files an issue touches, and scores your pull request against the issue and CONTRIBUTING.md before a maintainer sees it. Free, no login, AGPL-3.0.";

/** 40–60 word direct answer shown near the top of the home page. */
export const WHAT_IS =
  "FirstPR is a free, open-source web app that helps developers land their first open-source pull request. Match finds open, unassigned good-first issues on public GitHub repos. Explain points to the real files an issue touches. Review scores your pull request against the issue and CONTRIBUTING.md. It never writes the fix for you.";

export const KEYWORDS = [
  "good first issue",
  "first pull request",
  "open source contribution",
  "beginner GitHub issues",
  "help wanted issues",
  "pull request review",
  "CONTRIBUTING.md",
  "GitHub App",
  "FirstPR",
];

export const FEATURES = [
  {
    name: "Match",
    path: "/#match",
    summary:
      "Takes a GitHub username and an optional repo, then lists open good-first and help-wanted issues with no assignee.",
  },
  {
    name: "Explain",
    path: "/explain",
    summary:
      "Takes a GitHub issue link and summarizes it, citing files that exist in that repo. It does not write a patch.",
  },
  {
    name: "Review",
    path: "/review",
    summary:
      "Scores a pull request URL or a pasted diff against the issue, the repo's CONTRIBUTING.md, and the change itself.",
  },
  {
    name: "FirstPRbot",
    path: "/#bot",
    summary:
      "A GitHub App. On a repo where it is installed, /firstpr explain on an issue posts a guide and /firstpr review on a pull request posts a score card.",
  },
] as const;

export const STEPS = [
  {
    name: "Find an issue",
    text: "Enter your GitHub username in Match to list open, unassigned good-first issues that fit your languages.",
    path: "/#match",
  },
  {
    name: "Understand it",
    text: "Paste the issue link into Explain to see a summary and the real files in the repo that it touches.",
    path: "/explain",
  },
  {
    name: "Check your PR",
    text: "Write the change yourself, open a pull request, then paste its URL into Review for a score card before a maintainer reads it.",
    path: "/review",
  },
] as const;

/** Real questions from the home page. The first sentence of each answer answers it. */
export const FAQ = [
  {
    q: "Does FirstPR write the fix?",
    a: "No. Explain and the hint ladder are written to refuse code-for-me requests. You edit the repo yourself.",
  },
  {
    q: "Which repos can it read?",
    a: "Public GitHub repositories only. Private repos are not part of this app.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no login. Match asks for a GitHub username so it can look up public languages and issues.",
  },
  {
    q: "What does FirstPRbot do?",
    a: "FirstPRbot posts an issue guide or a pull request score card on repos where its GitHub App is installed. Comment /firstpr explain on an issue or /firstpr review on a pull request; opening or updating a PR can post the card too. The bot does not write the fix.",
  },
  {
    q: "Where does my text go?",
    a: "Issue and PR text is sent to the model provider configured on the server (OpenAI by default, optional Neysa endpoints for file picking). It is used for explain, hints, difficulty, and review. See the privacy page for the full list.",
  },
] as const;

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
