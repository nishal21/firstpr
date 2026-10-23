import fs from "node:fs";

const t = fs.readFileSync("lib/i18n.ts", "utf8");

function extract(name) {
  const marker = `const ${name}: Record<I18nKey, string> = {`;
  const start = t.indexOf(marker);
  if (start < 0) throw new Error("no " + name);
  let i = start + marker.length;
  let depth = 1;
  while (i < t.length && depth > 0) {
    const c = t[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  return t.slice(start, i) + ";";
}

const out = `import type { I18nKey } from "@/lib/i18n-en";

${extract("ml")}

${extract("hi")}

export { ml, hi };
`;
fs.writeFileSync("lib/i18n-ml-hi.ts", out);
console.log("wrote lib/i18n-ml-hi.ts", out.length);
