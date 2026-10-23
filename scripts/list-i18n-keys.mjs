import fs from "node:fs";
const t = fs.readFileSync("lib/i18n.ts", "utf8");
const m = t.match(/const en = \{([\s\S]*?)\} as const/);
const keys = [...m[1].matchAll(/"([^"]+)":/g)].map((x) => x[1]);
console.log(keys.length);
fs.writeFileSync("scripts/i18n-keys.json", JSON.stringify(keys, null, 2));
