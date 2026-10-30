/**
 * Offline checks that the site's fonts are self-hosted, so a build never fetches from Google.
 * npx tsx scripts/verify-fonts.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

let checks = 0;
let failed = 0;
function check(name: string, ok: boolean): void {
  checks += 1;
  if (!ok) {
    failed += 1;
    console.log(`FAIL ${name}`);
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const sources = ["app", "components", "lib"].flatMap(walk).filter((f) => /\.(tsx?|css)$/.test(f));
check("no next/font/google import", !sources.some((f) => readFileSync(f, "utf8").includes("next/font/google")));
check("no fonts.googleapis.com link", !sources.some((f) => readFileSync(f, "utf8").includes("fonts.googleapis.com")));

const css = readFileSync("app/fonts.css", "utf8");
check("fonts.css has no gstatic url", !css.includes("fonts.gstatic.com"));
const urls = [...css.matchAll(/url\((\/fonts\/[^)]+)\)/g)].map((m) => m[1]);
check("fonts.css has font files", urls.length > 100);
check("every font file exists", urls.every((u) => existsSync(join("public", u))));

const layout = readFileSync("app/layout.tsx", "utf8");
check("layout imports fonts.css", layout.includes('import "./fonts.css";'));
for (const href of [...layout.matchAll(/"(\/fonts\/[^"]+\.woff2)"/g)].map((m) => m[1])) {
  check(`preloaded ${href} exists`, existsSync(join("public", href)));
}

const vars = ["--font-sans", "--font-spray", "--font-plex", "--font-ml", "--font-deva", "--font-ta", "--font-bn", "--font-zh", "--font-ja", "--font-ko", "--font-ar"];
for (const v of vars) check(`${v} defined`, new RegExp(`^\\s*${v}: "`, "m").test(css));

const folders = readdirSync(join("public", "fonts"));
check("eleven font folders", folders.length === 11);
for (const f of folders) {
  const ofl = join("public", "fonts", f, "OFL.txt");
  check(`${f} has OFL.txt`, existsSync(ofl) && readFileSync(ofl, "utf8").includes("SIL OPEN FONT LICENSE"));
}

console.log(`verify-fonts: ${checks - failed}/${checks} checks passed`);
if (failed) process.exit(1);