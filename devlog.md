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

## 2026-10-23 — Match
- `lib/match.ts`, `POST /api/match`, home `MatchForm`, `/issue/...` → explain
- Score without AI; skip assignees; languages badges
- Checked: NekoDroid → picked from open set; #2 Assigned to @iniyananto-sys

## 2026-10-23 — Fix Neysa env read
- `getEnv()` + dynamic `process.env[name]` so BASE_URL/MODEL aren’t stuck empty after boot
- Restart `npm run dev` after .env changes

## 2026-10-23 — Fix Vercel build (/issue)
- `export const instant = false` on `/issue/[owner]/[repo]/[number]` (cacheComponents + redirect)
- `npm run build` passes locally

## 2026-10-23 — pickFiles fallback chain
- `lib/neysa.ts`: Gemma → Qwen → OpenAI; 6s each; qwen `enable_thinking:false`; connection cooldown 5m
- `lib/env.ts` / `.env.example`: GEMMA_* + QWEN_*; removed old NEYSA_API_KEY/BASE_URL/MODEL
- `lib/llm.ts`: dropped Neysa first_pass path (file pick owns Neysa)
- Explain UI: gemma | qwen | openai labels
- Checked: `verify-pick-chain.ts` → qwen then openai

## 2026-10-23 — OpenAI backup key
- Added `lib/openai.ts` `withOpenAI`; env `OPENAI_API_KEY_BACKUP`
- All OpenAI via `generateJson` → backup on auth/quota/5xx/network
- Checked: fake primary → backup succeeds (ping + review task)

## 2026-10-23 — lines.ts + pickFiles.ts
- Added `lib/lines.ts`, `lib/pickFiles.ts`, `firstPassPickSchema`
- Debug GET includes `pickFiles` for issue #4
- Checked: `/api/debug` → src/main.ts focusLine 776

## 2026-10-23 — Explain UI + lib/explain
- `lib/explain.ts`, new explain prompt/schema, rewrite `/api/explain`
- `/issue/...` client UI (summary, citations, done_when, how_to_check, Hints placeholder)
- `/explain` redirects to `/issue/...`
- Checked: POST #4 → src/main.ts L775–L778 verified permalinks

## Next
- Hints + refusal
- Review flow
- Vercel env
