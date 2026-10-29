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

const USERNAME =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const NAME = /^[A-Za-z0-9_.-]+$/;

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

function cleanRepo(name: string): string {
  return name.replace(/\.git$/i, "").replace(/[).,]+$/g, "");
}

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

function languageIn(words: string[]): string | undefined {
  for (const word of words) {
    const hit = LANG[word.toLowerCase()];
    if (hit) return hit;
  }
  return undefined;
}

function singleToken(token: string): SearchFlow[] {
  const lower = token.toLowerCase();
  const lang = LANG[lower];
  const skill = SKILL.has(lower);
  const out: SearchFlow[] = [];
  if (lang || skill) {
    out.push(topicFlow(token, lang));
  }
  if (USERNAME.test(token)) {
    out.push(userFlow(token));
  }
  if (out.length === 0) {
    out.push(topicFlow(token));
  }
  return out;
}

/**
 * Turn a raw omnibox string into ordered flows.
 * The first item is what Enter should open.
 */
export function parseOmniQuery(raw: string): SearchFlow[] {
  const q = raw.trim();
  if (!q) return [];

  if (q.startsWith("@")) {
    const name = q.slice(1).trim();
    if (USERNAME.test(name)) return [userFlow(name)];
  }

  const pr = q.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i,
  );
  if (pr) {
    const owner = pr[1];
    const repo = cleanRepo(pr[2]);
    const number = Number(pr[3]);
    const url = `https://github.com/${owner}/${repo}/pull/${number}`;
    return [
      {
        flow: "review",
        owner,
        repo,
        number,
        href: `/review?pr=${encodeURIComponent(url)}`,
      },
    ];
  }

  const issue = q.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)\/issues\/(\d+)/i,
  );
  if (issue) {
    const owner = issue[1];
    const repo = cleanRepo(issue[2]);
    const number = Number(issue[3]);
    return [
      {
        flow: "explain",
        owner,
        repo,
        number,
        href: `/issue/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${number}`,
      },
    ];
  }

  const profile = q.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s#?]+)\/?$/i,
  );
  if (profile && USERNAME.test(profile[1])) {
    return [userFlow(profile[1])];
  }

  const repoUrl = q.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i,
  );
  if (repoUrl && NAME.test(repoUrl[1]) && NAME.test(cleanRepo(repoUrl[2]))) {
    return [readinessFlow(repoUrl[1], cleanRepo(repoUrl[2]))];
  }

  const slash = q.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (
    slash &&
    NAME.test(slash[1]) &&
    NAME.test(cleanRepo(slash[2])) &&
    !LANG[slash[1].toLowerCase()]
  ) {
    return [readinessFlow(slash[1], cleanRepo(slash[2]))];
  }

  if (!/\s/.test(q)) return singleToken(q);

  const words = q.split(/\s+/).filter(Boolean);
  return [topicFlow(q, languageIn(words))];
}

export function queryLooksLikeGitHubUrl(raw: string): boolean {
  return /github\.com\//i.test(raw) || /^[^/\s]+\/[^/\s]+$/.test(raw.trim());
}
