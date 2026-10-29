export type ReadyCheck = {
  id: string;
  label: string;
  passed: boolean;
  points: number;
  max: number;
  detail: string;
};

export type ReadyScore = {
  score: number;
  checks: ReadyCheck[];
};

function has(paths: string[], pattern: RegExp): boolean {
  return paths.some((path) => pattern.test(path));
}

/**
 * Maintainer score for "can a newcomer start here".
 * Points are fixed in code. They are not a model opinion.
 */
export function scoreNewcomerReady(input: {
  paths: string[];
  openUnassignedGfi: number;
  setupMinutes: number | null;
  hasSetupHeading: boolean;
}): ReadyScore {
  const paths = input.paths;
  const checks: ReadyCheck[] = [];

  const license = has(paths, /(^|\/)(license|licence|copying)(\.|$)/i);
  checks.push({
    id: "license",
    label: "License file",
    passed: license,
    max: 10,
    points: license ? 10 : 0,
    detail: license
      ? "A license file is in the tree."
      : "No LICENSE file in the tree. Newcomers cannot tell if they may contribute.",
  });

  const contributing = has(paths, /(^|\/)contributing\.md$/i);
  checks.push({
    id: "contributing",
    label: "CONTRIBUTING.md",
    passed: contributing,
    max: 20,
    points: contributing ? 20 : 0,
    detail: contributing
      ? "CONTRIBUTING.md exists."
      : "No CONTRIBUTING.md. The first PR has no written rules.",
  });

  const conduct = has(paths, /(^|\/)code_of_conduct\.md$/i);
  checks.push({
    id: "conduct",
    label: "Code of conduct",
    passed: conduct,
    max: 10,
    points: conduct ? 10 : 0,
    detail: conduct
      ? "CODE_OF_CONDUCT.md exists."
      : "No CODE_OF_CONDUCT.md.",
  });

  const templates = has(
    paths,
    /(^|\/)\.github\/(issue_template|ISSUE_TEMPLATE)(\/|$)/,
  ) || has(paths, /(^|\/)issue_template\.md$/i);
  checks.push({
    id: "templates",
    label: "Issue template",
    passed: templates,
    max: 15,
    points: templates ? 15 : 0,
    detail: templates
      ? "An issue template is in the repo."
      : "No issue template. Reports arrive as blank boxes.",
  });

  const setupOk = input.hasSetupHeading || (input.setupMinutes != null && input.setupMinutes <= 45);
  checks.push({
    id: "setup",
    label: "First-run path",
    passed: setupOk,
    max: 15,
    points: setupOk ? 15 : 0,
    detail: setupOk
      ? "README has a setup section, or the file heuristic is 45 minutes or under."
      : "No setup heading, and the file heuristic is over 45 minutes.",
  });

  const oneGfi = input.openUnassignedGfi >= 1;
  checks.push({
    id: "gfi",
    label: "An open beginner issue",
    passed: oneGfi,
    max: 20,
    points: oneGfi ? 20 : 0,
    detail: oneGfi
      ? `${input.openUnassignedGfi} open beginner-labeled issue${input.openUnassignedGfi === 1 ? "" : "s"} with no assignee.`
      : "No open unassigned beginner-labeled issue right now.",
  });

  const several = input.openUnassignedGfi >= 3;
  checks.push({
    id: "gfi-depth",
    label: "More than one door in",
    passed: several,
    max: 10,
    points: several ? 10 : 0,
    detail: several
      ? "At least three open unassigned beginner issues."
      : "Fewer than three open unassigned beginner issues.",
  });

  const score = checks.reduce((sum, check) => sum + check.points, 0);
  return { score, checks };
}
