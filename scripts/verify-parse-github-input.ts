// Run with: node scripts/verify-parse-github-input.ts
import { parseGitHubInput, shortLabel } from "../lib/parse-github-input.ts";

type Want =
  | ["pull" | "issue", string, number]
  | ["repo", string]
  | ["user", string]
  | ["url"]
  | ["text"]
  | ["empty"];

const cases: Array<[string, Want]> = [
  ["https://github.com/facebook/react-native", ["repo", "facebook/react-native"]],
  ["github.com/facebook/react-native", ["repo", "facebook/react-native"]],
  ["www.github.com/facebook/react-native/", ["repo", "facebook/react-native"]],
  ["https://github.com/facebook/react-native.git", ["repo", "facebook/react-native"]],
  ["http://www.github.com/facebook/react-native.git/", ["repo", "facebook/react-native"]],
  ["https://github.com/facebook/react-native/tree/main/packages", ["repo", "facebook/react-native"]],
  ["https://github.com/facebook/react-native/blob/main/README.md", ["repo", "facebook/react-native"]],
  ["https://github.com/facebook/react-native/issues", ["repo", "facebook/react-native"]],
  ["https://github.com/facebook/react-native/pull/12345", ["pull", "facebook/react-native", 12345]],
  ["https://github.com/facebook/react-native/pull/12345/files", ["pull", "facebook/react-native", 12345]],
  ["github.com/facebook/react-native/issues/42", ["issue", "facebook/react-native", 42]],
  ["https://github.com/nishal21/NekoDroid/issues/4#issuecomment-1", ["issue", "nishal21/NekoDroid", 4]],
  ["https://patch-diff.githubusercontent.com/raw/facebook/react-native/pull/54321.diff", ["pull", "facebook/react-native", 54321]],
  ["https://patch-diff.githubusercontent.com/raw/facebook/react-native/pull/54321.patch", ["pull", "facebook/react-native", 54321]],
  ["patch-diff.githubusercontent.com/raw/facebook/react-native/pull/7", ["pull", "facebook/react-native", 7]],
  ["https://raw.githubusercontent.com/facebook/react-native/main/README.md", ["repo", "facebook/react-native"]],
  ["https://api.github.com/repos/facebook/react-native", ["repo", "facebook/react-native"]],
  ["https://api.github.com/repos/facebook/react-native/pulls/9", ["pull", "facebook/react-native", 9]],
  ["https://api.github.com/repos/facebook/react-native/issues/8", ["issue", "facebook/react-native", 8]],
  ["https://api.github.com/users/octocat", ["user", "octocat"]],
  ["git@github.com:facebook/react-native.git", ["repo", "facebook/react-native"]],
  ["https://github.com/octocat", ["user", "octocat"]],
  ["github.com/octocat/", ["user", "octocat"]],
  ["https://github.com/orgs/facebook", ["user", "facebook"]],
  ["@octocat", ["user", "octocat"]],
  ["facebook/react-native", ["repo", "facebook/react-native"]],
  ["  nishal21/NekoDroid  ", ["repo", "nishal21/NekoDroid"]],
  ["<https://github.com/facebook/react-native>", ["repo", "facebook/react-native"]],
  ["https://github.com/facebook/react-native).", ["repo", "facebook/react-native"]],
  ["https://github.com/topics/python", ["url"]],
  ["https://github.com/", ["url"]],
  ["github.com", ["url"]],
  ["https://gitlab.com/foo/bar", ["url"]],
  ["https://example.com/some/long/path?x=1", ["url"]],
  ["www.example.com", ["url"]],
  ["example.com", ["url"]],
  ["ftp://github.com/a/b", ["url"]],
  ["next.js", ["text"]],
  ["python", ["text"]],
  ["easy python docs issue", ["text"]],
  ["c/c++", ["text"]],
  ["@", ["text"]],
  ["", ["empty"]],
  ["   ", ["empty"]],
];

let failed = 0;
for (const [input, want] of cases) {
  const got = parseGitHubInput(input);
  let ok = got.kind === want[0];
  if (ok && (got.kind === "pull" || got.kind === "issue")) {
    ok = `${got.owner}/${got.repo}` === want[1] && got.number === want[2];
  } else if (ok && got.kind === "repo") {
    ok = `${got.owner}/${got.repo}` === want[1];
  } else if (ok && got.kind === "user") {
    ok = got.username === want[1];
  }
  if (!ok) {
    console.error("FAIL", JSON.stringify(input), "want", want, "got", got);
    failed += 1;
  }
}

const long = "https://example.com/" + "a".repeat(200);
const label = shortLabel(long, 60);
if (label.length !== 60 || !label.includes("…")) {
  console.error("FAIL shortLabel", label.length, label);
  failed += 1;
}
if (shortLabel("facebook/react-native") !== "facebook/react-native") {
  console.error("FAIL shortLabel keeps short text");
  failed += 1;
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("parse-github-input ok", cases.length);
