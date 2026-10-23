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

## 2026-10-23 — Learn this first relevance
- `lib/serp.ts` language prepend/filter/boost + site: fallback; Explain returns `language` + `learn`
- Prompt: concept terms start with language/tool
- Checked: #6 Rust Book/By Example; #4 MDN Window.alert

## 2026-10-23 — Hint ladder + refusal
- `lib/hints.ts`, `lib/prompts/hints.ts`, `hintSchema`, `/api/hint`, `HintLadder`
- Explain uses `explainIssueCached` so hints reuse the same payload
- Checked: #4 refuse chip + L1→L3; L3 no TypeScript

## 2026-10-23 — Fix Ask FirstPR overwriting L3
- Split hints vs chat state in `HintLadder`; render all unlocked cards + chat thread
- Checked: ask no longer replaces Level 3 pseudocode

## 2026-10-23 — Review checks + score + API
- Added `lib/checks.ts`, `lib/score.ts`, `app/api/review/route.ts`
- `GoodFirstIssue.state` + `getBranchSha`
- Checked: PR #1 linked_issue fail; returns checks + score

## 2026-10-23 — AI review + ScoreCard UI
- Added `lib/prompts/review.ts`, `reviewSchema`, `lib/review.ts`, `lib/review-format.ts`, `components/score-card.tsx`
- `/api/review` now calls `reviewPr` (LLM + merge + score)
- `/review` full UI; script `scripts/verify-review.ts`
- Checked: NekoDroid #7 → 57/almost, 9 checklist rows with Rule/AI + fix lines

## 2026-10-23 — Review bugs (tests / badge / CONTRIBUTING)
- Inline-test detection in `lib/checks.ts`
- `verdictFromChecklist` + `summaryForVerdict` + badge labels Needs changes / Almost ready / Ready to merge
- Required `contributing_rules` on schema + retry/fallback in `lib/review.ts`
- Checked #7: tests pass, Almost ready, CONTRIBUTING real result

## 2026-10-23 — Check evidence polish
- `expectedCheckCommands` / `inferCheckCommands` / tree `repoPaths` in review
- Footer text updated in `lib/review-format.ts`
- Checked: pytest dropped without Python markers; #7 expects cargo + npm only

## 2026-10-23 — Pasted-diff N/A
- CheckStatus `na`; ScoreCard grey Minus; score scales applicable weights
- Checked: four PR-only rows N/A; all-pass applicable → 100

## 2026-10-23 — Pasted CONTRIBUTING + AI cap
- `buildReviewUserPrompt` pastedDiff mode; CONTRIBUTING fail soft-clamp; `AI_FAIL_SCORE_CAP=60`
- Footer updated; verified pasted + issue fail → score 55

## 2026-10-23 — UI polish
- `flow-steps.tsx`, `spinner.tsx`; page/match/issue/review/hint/layout/globals
- No lib or API changes

## 2026-10-23 — Forgiving Match repo
- `lib/github.ts` parseRepo + `lib/match.ts` resolveMatchRepo (username → nishal21)
- Checked: bare / owner/repo / URL → #3 on NekoDroid

## 2026-10-23 — Match difficulty
- `BEGINNER_LABELS`, `issueHasOpenLinkedPr`, age/assignee filters in `lib/github.ts` + `lib/match.ts`
- `lib/difficulty.ts` + `difficultySchema`; explain/match return `difficultyBadge`
- UI: `components/difficulty-badge.tsx` on Match + Explain
- Checked: #4 Beginner-friendly; graphify#3666 Stretch; tsc clean

## 2026-10-24 — Explain limits notice
- `lib/prompts/explain.ts`, `lib/limits-notice.ts`, schema describe, `issue-explain` hide-when-empty
- Box only when `formatLimitsNotice` returns text

## 2026-10-24 — UI i18n replace
- `lib/i18n.ts`, `language-provider.tsx`, globe `LangToggle`, site header/footer/hero
- Wired Match/Explain/Review/ScoreCard/Hints/FlowSteps to `useT()`
- AI content lang no longer driven by UI toggle; tsc clean

## 2026-10-24 — Lang switcher polish
- `LangToggle`: button only (globe + name + ChevronDown 14px); custom w-40 menu; no `<select>`
- Checked: closes on pick / outside / Esc; setLang updates UI instantly

## 2026-10-24 — Lang menu overflow fix
- Menu was clipped by nav `overflow-x-auto` (looked like scroll arrows)
- Menu portaled to `document.body` with `fixed` + z-200; default English; 3 langs only

## 2026-10-24 — Expand UI langs (world)
- Files: `lib/i18n.ts`, `i18n-en.ts`, `i18n-ml-hi.ts`, `i18n-world.ts`, `language-provider.tsx`, `LangToggle.tsx`, `layout.tsx`, `globals.css`
- 15 langs in dropdown; storage via `parseUiLang`; scrollable menu
- Verified: `npx tsc --noEmit` exit 0
- Production still old until Vercel redeploy

## 2026-10-24 — Lang menu visibility
- Reordered UI_LANGS: en, es, zh, hi, ar, fr… (ml last) so opens show world langs
- Menu: viewport maxHeight, flip up, taller rows + scrollbar gutter
- Storage key `firstpr-ui-lang` (+ legacy sync); useLayoutEffect hydrate
- Pushed to main for Vercel

## 2026-10-24 — Strip Cursor co-author from commit
- Rewrote HEAD with commit-tree (no Co-authored-by); force-pushed `b12bbb8`
- Set `~/.cursor/cli-config.json` attribution.* = false
- Also turn off Cursor Settings → Git & PRs → Attribution

## 2026-10-24 — Demo fixtures (unkillable demo)
- `lib/cache.ts` getFixture/saveFixture → `data/demo/<key>.json` (15 fixtures recorded)
- `lib/demo.ts` DEMO_MODE on|auto|off + `x-firstpr-source`; RECORD_DEMO=1 writes only non-prod
- Routes match/explain/hint/review wrapped; UI saved-result dot; friendly errors; error.tsx/not-found.tsx
- `npx tsx scripts/record-demo.ts`; verified DEMO_MODE=on → all cache 200

## Next
- Commit `data/demo/*.json` with the demo feature
- Prod: set DEMO_MODE=auto (or on for always-fixture demo)
