export type SetupStep = {
  title: string;
  detail: string;
};

export type SetupEstimate = {
  /** Heuristic minutes from files that exist, not a measured install. */
  minutes: number;
  low: number;
  high: number;
  signals: string[];
  steps: SetupStep[];
  note: string;
};

const SETUP_HEADING =
  /^(#{1,3})\s+(.*(?:install|setup|getting started|development|quick ?start|build from source|local development).*)$/i;

const NATIVE_RE =
  /\b(apt-get|apt install|brew install|pacman|cmake|libssl|pkg-config|gcc|clang|rustup|python3-dev)\b/i;

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function hasPath(paths: string[], predicate: (path: string) => boolean): boolean {
  return paths.some(predicate);
}

function extractSection(readme: string): string | null {
  const lines = readme.split(/\r?\n/);
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(SETUP_HEADING);
    if (!match) continue;
    start = i + 1;
    level = match[1].length;
    break;
  }
  if (start < 0) return null;
  const body: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const heading = lines[i].match(/^(#{1,3})\s+/);
    if (heading && heading[1].length <= level) break;
    body.push(lines[i]);
    if (body.length > 40) break;
  }
  const text = body.join("\n").trim();
  return text.length > 0 ? text : null;
}

function stepsFromSection(section: string): SetupStep[] {
  const steps: SetupStep[] = [];
  for (const raw of section.split(/\r?\n/)) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*]|\d+[.)])\s+(.+)/);
    const fence = line.startsWith("```");
    if (fence) continue;
    if (!bullet) continue;
    const detail = bullet[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (detail.length < 3) continue;
    steps.push({
      title: `Step ${steps.length + 1}`,
      detail: detail.length > 220 ? `${detail.slice(0, 217)}…` : detail,
    });
    if (steps.length >= 6) break;
  }
  return steps;
}

function commandSteps(paths: string[], packageJson: string | null): SetupStep[] {
  const steps: SetupStep[] = [];
  const names = new Set(paths.map((path) => basename(path).toLowerCase()));

  if (
    names.has("devcontainer.json") ||
    paths.some((path) => path.toLowerCase().includes(".devcontainer/"))
  ) {
    steps.push({
      title: "Open the dev container",
      detail: "The repo ships .devcontainer. GitHub Codespaces or VS Code Dev Containers apply that config.",
    });
  }

  if (
    names.has("docker-compose.yml") ||
    names.has("docker-compose.yaml") ||
    names.has("compose.yml") ||
    names.has("compose.yaml")
  ) {
    steps.push({
      title: "Start services",
      detail: "docker compose up --build",
    });
  }

  if (packageJson) {
    let scripts: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(packageJson) as { scripts?: Record<string, unknown> };
      scripts = parsed.scripts ?? {};
    } catch {
      scripts = {};
    }
    const manager = names.has("pnpm-lock.yaml")
      ? "pnpm"
      : names.has("yarn.lock")
        ? "yarn"
        : names.has("bun.lock") || names.has("bun.lockb")
          ? "bun"
          : "npm";
    steps.push({
      title: "Install dependencies",
      detail: manager === "yarn" ? "yarn" : `${manager} install`,
    });
    const start = typeof scripts.dev === "string"
      ? scripts.dev
      : typeof scripts.start === "string"
        ? scripts.start
        : null;
    if (start) {
      const run = manager === "npm" ? `npm run ${typeof scripts.dev === "string" ? "dev" : "start"}` : `${manager} ${typeof scripts.dev === "string" ? "dev" : "start"}`;
      steps.push({ title: "Run the app", detail: run });
    }
  }

  if (names.has("cargo.toml")) {
    steps.push({ title: "Build", detail: "cargo build" });
  }
  if (names.has("go.mod")) {
    steps.push({ title: "Build", detail: "go test ./..." });
  }
  if (names.has("pyproject.toml") || names.has("requirements.txt")) {
    steps.push({
      title: "Python env",
      detail: names.has("requirements.txt")
        ? "python -m venv .venv && .venv/bin/pip install -r requirements.txt"
        : "Install the project from pyproject.toml with pip or uv.",
    });
  }
  if (names.has("gemfile")) {
    steps.push({ title: "Ruby", detail: "bundle install" });
  }
  if (names.has("makefile")) {
    steps.push({ title: "Make", detail: "Look at the Makefile targets before the first run." });
  }

  return steps.slice(0, 6);
}

/**
 * Estimate first-run time from files that exist.
 * Minutes are a labeled heuristic (base + penalties), not a stopwatch.
 */
export function estimateFromFiles(input: {
  paths: string[];
  readme: string | null;
  contributing: string | null;
  packageJson: string | null;
}): SetupEstimate {
  const paths = input.paths;
  const lower = paths.map((path) => path.toLowerCase());
  const signals: string[] = [];

  const devcontainer = lower.some(
    (path) => path.includes(".devcontainer/") || path.endsWith("devcontainer.json"),
  );
  const docker = lower.some(
    (path) =>
      path.endsWith("dockerfile") ||
      path.endsWith("docker-compose.yml") ||
      path.endsWith("docker-compose.yaml") ||
      path.endsWith("compose.yml") ||
      path.endsWith("compose.yaml"),
  );
  const node = hasPath(lower, (path) => path.endsWith("package.json"));
  const cargo = hasPath(lower, (path) => path.endsWith("cargo.toml"));
  const go = hasPath(lower, (path) => path.endsWith("go.mod"));
  const python = hasPath(
    lower,
    (path) => path.endsWith("pyproject.toml") || path.endsWith("requirements.txt"),
  );
  const ruby = hasPath(lower, (path) => path.endsWith("gemfile"));
  const manifests = [node, cargo, go, python, ruby].filter(Boolean).length;

  let minutes = 60;
  if (devcontainer) {
    minutes = 15;
    signals.push("dev container");
  } else if (docker) {
    minutes = 25;
    signals.push("Docker");
  } else if (manifests > 0) {
    minutes = 30;
    if (node) signals.push("Node");
    if (cargo) signals.push("Rust");
    if (go) signals.push("Go");
    if (python) signals.push("Python");
    if (ruby) signals.push("Ruby");
  } else if (input.readme) {
    minutes = 45;
    signals.push("README only");
  } else {
    signals.push("no obvious setup file");
  }

  const section = input.readme ? extractSection(input.readme) : null;
  if (!section && !devcontainer) {
    minutes += 15;
    signals.push("no setup heading in README");
  } else if (section) {
    signals.push("README setup section");
  }

  if (manifests > 1) {
    minutes += 10;
    signals.push("more than one toolchain");
  }

  const readmeAndContributing = `${input.readme ?? ""}\n${input.contributing ?? ""}`;
  if (NATIVE_RE.test(readmeAndContributing)) {
    minutes += 20;
    signals.push("native dependencies mentioned");
  }

  if (input.contributing && input.contributing.length > 80 && input.contributing.length < 4000) {
    minutes = Math.max(10, minutes - 5);
    signals.push("CONTRIBUTING.md");
  }

  minutes = Math.max(10, Math.min(180, minutes));

  let steps = section ? stepsFromSection(section) : [];
  if (steps.length === 0) {
    steps = commandSteps(paths, input.packageJson);
  }

  return {
    minutes,
    low: Math.max(10, minutes - 10),
    high: Math.min(180, minutes + 15),
    signals,
    steps,
    note: "Estimate from repo files (README, manifests, containers). It is not a timed install.",
  };
}
