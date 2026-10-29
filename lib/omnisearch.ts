import {
  GITHUB_USERNAME,
  parseGitHubInput,
  type GitHubInput,
} from "./parse-github-input";

export type SearchFlow =
  | {
      flow: "explain";
      href: string;
      owner: string;
      repo: string;
      number: number;
    }
  | {
      flow: "review";
      href: string;
      owner: string;
      repo: string;
      number: number;
    }
  | {
      flow: "readiness";
      href: string;
      owner: string;
      repo: string;
    }
  | {
      /** Open beginner issues in one repo, with Match prefilled. */
      flow: "repo-issues";
      href: string;
      owner: string;
      repo: string;
    }
  | {
      flow: "match-user";
      href: string;
      username: string;
    }
  | {
      flow: "match-topic";
      href: string;
      query: string;
      language?: string;
    };

const USERNAME = GITHUB_USERNAME;

/** GitHub linguist names. Keys are what a newcomer might type. */
const LANG: Record<string, string> = {
  python: "Python",
  py: "Python",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  rust: "Rust",
  go: "Go",
  golang: "Go",
  java: "Java",
  kotlin: "Kotlin",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  dart: "Dart",
  c: "C",
  cpp: "C++",
  "c++": "C++",
  csharp: "C#",
  "c#": "C#",
  html: "HTML",
  css: "CSS",
  shell: "Shell",
  bash: "Shell",
};

const SKILL = new Set([
  "react",
  "vue",
  "svelte",
  "angular",
  "django",
  "flask",
  "rails",
  "node",
  "nodejs",
  "next",
  "nextjs",
  "next.js",
  "docs",
  "documentation",
  "readme",
  "tailwind",
  "express",
]);

function topicHref(query: string, language?: string): string {
  const q = encodeURIComponent(query);
  const lang = language ? `&lang=${encodeURIComponent(language)}` : "";
  return `/?q=${q}${lang}#match`;
}

function userFlow(username: string): SearchFlow {
  return {
    flow: "match-user",
    username,
    href: `/?user=${encodeURIComponent(username)}#match`,
  };
}

function topicFlow(query: string, language?: string): SearchFlow {
  return {
    flow: "match-topic",
    query,
    language,
    href: topicHref(query, language),
  };
}

function readinessFlow(owner: string, repo: string): SearchFlow {
  return {
    flow: "readiness",
    owner,
    repo,
    href: `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  };
}

function repoIssuesFlow(owner: string, repo: string): SearchFlow {
  return {
    flow: "repo-issues",
    owner,
    repo,
    href: `/?q=${encodeURIComponent(`${owner}/${repo}`)}#match`,
  };
}

function languageIn(words: string[]): string | undefined {
  for (const word of words) {
    const hit = LANG[word.toLowerCase()];
    if (hit) return hit;
  }
  return undefined;
}

function isReservedWord(token: string): boolean {
  const lower = token.toLowerCase();
  return Boolean(LANG[lower]) || SKILL.has(lower);
}

function singleToken(token: string): SearchFlow[] {
  const lower = token.toLowerCase();
  const lang = LANG[lower];
  if (isReservedWord(token)) {
    return [topicFlow(token, lang)];
  }
  if (USERNAME.test(token)) {
    return [userFlow(token), topicFlow(token)];
  }
  return [topicFlow(token, lang)];
}

/**
 * Turn a raw omnibox string into ordered flows.
 * The first item is what Enter should open.
 * A link that isn't a GitHub repo, issue or PR gives no flows.
 */
export function parseOmniQuery(raw: string): SearchFlow[] {
  return flowsFor(parseGitHubInput(raw));
}

function flowsFor(input: GitHubInput): SearchFlow[] {
  switch (input.kind) {
    case "empty":
    case "url":
      return [];
    case "user":
      return [userFlow(input.username)];
    case "pull": {
      const { owner, repo, number } = input;
      const url = `https://github.com/${owner}/${repo}/pull/${number}`;
      return [
        {
          flow: "review",
          owner,
          repo,
          number,
          href: `/review?pr=${encodeURIComponent(url)}`,
        },
        repoIssuesFlow(owner, repo),
      ];
    }
    case "issue": {
      const { owner, repo, number } = input;
      return [
        {
          flow: "explain",
          owner,
          repo,
          number,
          href: `/issue/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}`,
        },
        repoIssuesFlow(owner, repo),
      ];
    }
    case "repo": {
      // "js/ts" or "python/docs" is a search, not a repo.
      if (isReservedWord(input.owner) && isReservedWord(input.repo)) {
        return [topicFlow(`${input.owner}/${input.repo}`)];
      }
      return [
        readinessFlow(input.owner, input.repo),
        repoIssuesFlow(input.owner, input.repo),
      ];
    }
    case "text": {
      const q = input.text;
      if (!/\s/.test(q)) return singleToken(q);
      const words = q.split(/\s+/).filter(Boolean);
      return [topicFlow(q, languageIn(words))];
    }
    default: {
      const exhaustive: never = input;
      return exhaustive;
    }
  }
}

/** True when the input is any link or owner/repo, so a word search makes no sense. */
export function queryLooksLikeGitHubUrl(raw: string): boolean {
  const kind = parseGitHubInput(raw).kind;
  return kind !== "text" && kind !== "empty";
}
