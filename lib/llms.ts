import {
  CONTACT_EMAIL,
  FAQ,
  FEATURES,
  LICENSE,
  MAKERS,
  ORG_NAME,
  ORG_URL,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  STEPS,
  WHAT_IS,
  absoluteUrl,
} from "@/lib/site";

function links(): string[] {
  return [
    `- [Home and Match](${absoluteUrl("/")}): search beginner issues or match by GitHub username`,
    `- [Explain](${absoluteUrl("/explain")}): paste a GitHub issue link to see the files it touches`,
    `- [Review](${absoluteUrl("/review")}): score a pull request URL or a pasted diff`,
    `- [Issue pages](${absoluteUrl("/issue/nishal21/NekoDroid/6")}): /issue/{owner}/{repo}/{number} explains one issue`,
    `- [Repo pages](${absoluteUrl("/repo/nishal21/NekoDroid")}): /repo/{owner}/{repo} lists a repo's open beginner issues`,
    `- [Privacy](${absoluteUrl("/privacy")})`,
    `- [Terms](${absoluteUrl("/terms")})`,
    `- [Credits](${absoluteUrl("/credits")})`,
    `- [Source code](${REPO_URL})`,
  ];
}

export function llmsTxt(): string {
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    WHAT_IS,
    "",
    "## Features",
    "",
    ...FEATURES.map((f) => `- [${f.name}](${absoluteUrl(f.path)}): ${f.summary}`),
    "",
    "## Key pages",
    "",
    ...links(),
    "",
    "## About",
    "",
    `- Made by ${MAKERS.join(" and ")} (${ORG_NAME}, ${ORG_URL}).`,
    `- License: ${LICENSE}. A separate commercial license is available from ${CONTACT_EMAIL}.`,
    "- No login. Only public GitHub repositories are read.",
    "- FirstPR does not write code, commit, or open pull requests for you.",
    "",
    "## Optional",
    "",
    `- [Full text for language models](${absoluteUrl("/llms-full.txt")})`,
    "",
  ].join("\n");
}

export function llmsFullTxt(): string {
  return [
    llmsTxt().trimEnd(),
    "",
    "## How it works",
    "",
    ...STEPS.map((s, i) => `${i + 1}. ${s.name}: ${s.text} (${absoluteUrl(s.path)})`),
    "",
    "## What FirstPR will not do",
    "",
    "- Write your code, a commit message, or a patch.",
    "- Open, push, or merge a pull request for you.",
    "- Replace the maintainer's review.",
    "",
    "## FirstPRbot commands",
    "",
    "- `/firstpr explain` in an issue comment: posts a guide to the issue.",
    "- `/firstpr review` in a pull request comment: posts a score card for the pull request.",
    "- Opening or updating a pull request on a repo with the app installed can post the score card too.",
    "",
    "## FAQ",
    "",
    ...FAQ.flatMap((item) => [`### ${item.q}`, "", item.a, ""]),
    "## Languages",
    "",
    "The interface is written in English, Malayalam, and Hindi. Other languages in the menu fall back to English where a line has not been translated. All languages share the same URLs.",
    "",
  ].join("\n");
}

export function textResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
