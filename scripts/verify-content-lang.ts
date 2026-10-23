import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const { explainIssue } = await import("../lib/explain");
  const { withContentLang } = await import("../lib/content-lang");

  console.log(
    "prompt ml snippet:",
    withContentLang("BASE.", "ml").split("\n").slice(-2).join(" "),
  );

  const ml = await explainIssue({
    owner: "nishal21",
    repo: "NekoDroid",
    number: 4,
    lang: "ml",
  });
  const summaryMl = ml.explanation.summary;
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(summaryMl);
  const pathsEn = ml.citations.every((c) => /^[\w./-]+$/.test(c.path));
  console.log("ml summary:", summaryMl.slice(0, 120));
  console.log("hasMalayalam", hasMalayalam, "pathsOk", pathsEn);
  console.log(
    "citations",
    ml.citations.map((c) => `${c.path}:${c.start}-${c.end}`),
  );

  const en = await explainIssue({
    owner: "nishal21",
    repo: "NekoDroid",
    number: 4,
    lang: "en",
  });
  const summaryEn = en.explanation.summary;
  const mostlyLatin = /^[\x00-\x7F\s\u2019\u2018\u201c\u201d—–…]+$/u.test(
    summaryEn.slice(0, 80),
  );
  console.log("en summary:", summaryEn.slice(0, 120));
  console.log("enLooksEnglish", mostlyLatin || !/[\u0D00-\u0D7F]/.test(summaryEn));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
