// Run with: node scripts/verify-repo-visibility.ts
import { isPublicRepoData } from "../lib/repo-visibility.ts";

const cases: Array<[Parameters<typeof isPublicRepoData>[0], boolean]> = [
  [{ private: false, visibility: "public" }, true],
  [{ private: false }, true],
  [{ private: true, visibility: "private" }, false],
  [{ private: true }, false],
  [{ private: false, visibility: "internal" }, false],
  [{ private: false, visibility: "private" }, false],
  [{ visibility: "public" }, false],
  [{}, false],
  [null, false],
  [undefined, false],
];

let failed = 0;
for (const [input, want] of cases) {
  const got = isPublicRepoData(input);
  if (got !== want) {
    console.error("FAIL", JSON.stringify(input), "want", want, "got", got);
    failed += 1;
  }
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("repo-visibility ok", cases.length);
