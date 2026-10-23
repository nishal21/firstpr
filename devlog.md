# Devlog

## 2026-10-23 — Base app
Done:
- `.env.example`, `.gitattributes` (`* text=auto eol=lf`)
- `.gitignore`: ignore `.env`, `.env*.local`, `.cursor`; keep `.env.example`
- `lib/env.ts` (zod, secrets optional until call)
- `app/layout.tsx` shell + Sonner; `app/page.tsx` hero; stub `app/review/page.tsx`
Verify: `npm run build` and `npm run dev` → localhost:3000

## 2026-10-23 — lib/github + /api/debug
- Added `lib/cache.ts`, `lib/github.ts`, `app/api/debug/route.ts`
- Debug (dev only): `parseRepo(DEMO_REPO)` → getRepo, listGoodFirstIssues, getRateLimit
- Note: omit `export const runtime` under cacheComponents
- Checked: `/api/debug` → main, sha, issues #2–#6, core 4947

## 2026-10-23 — lib/llm + schemas
- Added `lib/llm.ts`, `lib/schemas.ts`; debug returns `llm: { ok: true }`
- Optional `OPENAI_BASE_URL` in env; localhost proxy values ignored
- Checked: `/api/debug` → llm ok; terminal `[llm] … model=gpt-6-luna … tokens`

## 2026-10-23 — Neysa pickFiles + Explain
- Added `lib/neysa.ts`, `lib/prompts/explain.ts`, `app/api/explain`, `/explain` UI + source tag
- Schemas: `pickFilesSchema`, `explainSchema`
- Verified OpenAI path: NekoDroid #2 → README.md, tag “Files picked by OpenAI”
- Neysa endpoint refused (ECONNREFUSED :443); missing key also forces OpenAI

## 2026-10-23 — SerpApi Learn this first
- `lib/serp.ts`, `concepts` on explain schema, UI card under hints
- Checked: NekoDroid #6 → 3 Rust testing links (doc.rust-lang.org…); no key → section omitted

## 2026-10-23 — pickFiles scoring + 20-line previews
- `lib/neysa.ts` + explain passes `{owner,repo,sha}` for raw fetches
- Rank/filter → top 25 previews → Gemma/OpenAI

## 2026-10-23 — Demo shortcuts → #4 / #5
- Explain shortcuts, default issue, nav Explain link now NekoDroid #4 and #5
- Match/Review: no hardcoded issue nums yet

## Next
- Match API + home form
- Confirm Neysa tag once key + network work
