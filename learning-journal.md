# Learning journal

## 2026-10-23 — Base app shell
- App root is `firstpr/firstpr` (create-next-app nested under workspace).
- Env: soft zod parse in `lib/env.ts`; `requireOpenAIApiKey` / `requireGitHubToken` at call time so Vercel build does not need secrets.
- UI shell: Inter, top bar (FirstPR + blue dot), Find/Review nav, hero copy, footer, Sonner.
- Next: match/explain/review APIs and forms.

## 2026-10-23 — GitHub client
- `lib/cache.ts`: Map + 10m TTL; `cached()`.
- `lib/github.ts`: Octokit via `env.GITHUB_TOKEN` (warn + unauth fallback). `GitHubError` codes: rate_limited | not_found | github_error.
- `GET /api/debug` (non-prod): DEMO_REPO repo + good-first-issues + rate limit. Do not export `runtime` when `cacheComponents: true` (Next 16 conflict); `maxDuration = 60` ok.
- Verified: NekoDroid `main`, issues #2–#6, core ~5000.

## 2026-10-23 — LLM layer
- `lib/llm.ts`: `generateJson` (Neysa first_pass optional → OpenAI `responses.parse` + `zodTextFormat`), `ping`, `LlmError`.
- `lib/schemas.ts`: placeholder; use `.nullable()` not `.optional()` for structured outputs.
- Shell `OPENAI_BASE_URL=http://localhost:4000` breaks SDK — ignore localhost base URL, use `https://api.openai.com/v1`.
- `/api/debug` includes `llm: { ok: true }` + `[llm] task=… model=… tokens…` logs.

## 2026-10-23 — Neysa file pick + Explain
- `lib/neysa.ts` `pickFiles`: chat.completions JSON (no Responses/structured outputs), 10s AbortSignal, Zod + path filter, OpenAI fallback via `generateJson`. Never throws.
- Explain: `POST /api/explain`, `/explain` UI shows muted tag “Files picked by Gemma 4 on Neysa” | “Files picked by OpenAI”.
- Neysa host currently ECONNREFUSED from this machine → always OpenAI until endpoint + `NEYSA_API_KEY` in `.env.local` work.
- Fixed empty duplicate `NEYSA_BASE_URL=` in `.env` (first empty value won).

## 2026-10-23 — Learn this first (SerpApi)
- `explainSchema.concepts` required (1–2 search phrases).
- `lib/serp.ts` `learnLinks(q)` → SerpApi Google, 6s timeout, prefer docs hosts, Map cache, never throws.
- Explain UI: “Learn this first” card under hints + “Search by SerpApi”; hidden when no key/results.
- Verified #6 → doc.rust-lang.org testing links; empty key → 0 links.

## 2026-10-23 — pickFiles ranking + previews
- Filter: skip node_modules/target/dist/.git/pkg, lockfiles, binaries; cap 300.
- Score keyword overlap (words, backticks, fn names) → top 25; fetch 20 lines via raw GitHub.
- Force-include body path/fn mentions; Gemma gets path+preview; Zod + 10s + OpenAI fallback unchanged.

## 2026-10-23 — Demo issues #4 / #5
- Explain demo shortcuts + default + nav link: NekoDroid #4 and #5 (was #2 / #6).

## 2026-10-23 — Match
- `matchIssues`: languages, list/search GFI, skip assignees, score (+ext/+docs/+comments), fitReason.
- UI under hero; `/issue/{owner}/{repo}/{number}` redirects to Explain.

## 2026-10-23 — pickFiles Gemma→Qwen→OpenAI
- Env: `NEYSA_GEMMA_{KEY,URL,MODEL}` + `NEYSA_QWEN_*` (old `NEYSA_API_KEY/BASE_URL/MODEL` gone).
- Chain: each 6s AbortSignal; qwen sends `chat_template_kwargs.enable_thinking=false`; strip `</think>` then `{…}` JSON + Zod; 5m in-memory skip after connection errors.
- UI tags: “Gemma 4 on Neysa” | “Qwen 3.6 on Neysa” | “OpenAI”.
- Verified: Gemma timeout → `source=qwen`; keys cleared → `source=openai`. Script: `npx tsx --env-file=.env scripts/verify-pick-chain.ts`.

## 2026-10-23 — OpenAI backup key
- `lib/openai.ts`: primary + optional backup clients; `withOpenAI(fn)` retries once on 401/403/429/insufficient_quota/5xx/network. No retry on 400 or Zod/bad_output. Never log keys.
- `lib/llm.ts` `generateJson` uses `withOpenAI` (covers pickFiles OpenAI fallback, Explain, Hint, Review).
- Env: `OPENAI_API_KEY_BACKUP`. Verified: fake primary → 401 → backup → ping + review task ok.

## 2026-10-23 — lib/lines + lib/pickFiles
- `lib/lines.ts`: numberLines, windowAround, permalink (#L n or #La-Lb), verifyCitation (ok / moved within 30 / fail).
- `lib/pickFiles.ts`: Step A regex paths+line refs from issue; Step B `generateJson` first_pass only if A < 2; return ≤3 `{path, focusLine, why}`. Schema `firstPassPickSchema`.
- `/api/debug` includes pickFiles for NekoDroid #4 → `src/main.ts` focusLine 776.
- Note: distinct from `lib/neysa.ts` pickFiles (Explain file-pick chain).

## 2026-10-23 — Explain (product prompts)
- Prompt+schema from BUILD-PLAN §4 word-for-word in `lib/prompts/explain.ts` + `explainSchema`.
- `lib/explain.ts` `explainIssue`: pickFiles → file windows → CONTRIBUTING checks section → generateJson → verifyCitation → permalinks.
- `POST /api/explain` `{ owner, repo, number, lang }`; UI at `/issue/[owner]/[repo]/[number]`.
- Verified #4: citations `src/main.ts` L775–L778 (+ nearby), Open on GitHub permalink with sha.

## 2026-10-23 — Learn this first relevance
- Pass `repo.language` into Explain; concept terms must start with language/tool.
- `learnLinks(q, lang)`: prepend lang, filter by mention (official docs hosts always pass), boost Rust/JS/TS docs; site: fallback if needed. Hide section if &lt;2 links.
- Verified: #6 → doc.rust-lang.org testing; #4 → developer.mozilla.org alert().

## 2026-10-23 — Hint ladder + refusal
- `lib/prompts/hints.ts` + `hintSchema` from BUILD-PLAN §4 word-for-word.
- `lib/hints.ts` `getHint`: explainIssueCached, askedForCode regex, generateJson hint, code post-check+retry+strip.
- `POST /api/hint`; `HintLadder` on issue page (stepper, Ask FirstPR, refuse chip, blue refusal card).
- Verified #4: refuse → src/main.ts points; levels 2–3; L3 plain English, no TS.

## 2026-10-23 — Hint vs chat state split
- `HintLadder`: `hints[1..3]` only from Show next hint; `messages[]` only from Ask FirstPR.
- All unlocked hint cards stay visible; chat bubbles below labeled FirstPR (no Level label).
- Ask never overwrites hints (fixes L3 pseudocode replaced by chat answer).

## 2026-10-23 — Review deterministic checks
- `lib/checks.ts` runChecks: linked_issue, branch_name, description, check_evidence, tests_touched, scope, forbidden_files.
- `lib/score.ts` weights → score/verdict (ready/almost/not_yet); AI slots default warn.
- `POST /api/review` { prUrl } or { diff, repo, issueNumber }.
- Verified: NekoDroid PR #1 → linked_issue fail (no Fixes #N), score 58 almost; PR #7 has Fixes.

## 2026-10-23 — AI review + ScoreCard
- `lib/prompts/review.ts` + `reviewSchema` (BUILD-PLAN §4 word-for-word).
- `lib/review.ts` `reviewPr`: runChecks → generateJson task review/medium → hunk-filter line_comments → merge AI checklist (never override deterministic fail) → `scoreChecks`.
- `lib/review-format.ts`: client-safe types + “Copy as PR comment” markdown.
- `/review` UI: PR link | paste diff tabs, loading steps, ScoreCard ring + Rule/AI tags + line comments.
- Verified PR #7: score 57 almost, 9 checklist rows (7 Rule + 2 AI), fixes on non-pass.

## 2026-10-23 — Review bugfixes
- `tests_touched`: also pass on added lines with `#[cfg(test)]` / `#[test]` / `mod tests` / `describe(` / `it(` / `test(` / `def test_` → “Inline tests added in &lt;file&gt;”.
- Badge = checklist (any fail → Needs changes; any warn → Almost ready; all pass → Ready to merge); summary via `summaryForVerdict`.
- `contributing_rules: { status, detail }` required on `reviewSchema`; retry once; else warn + hand-review text.
- Verified #7: tests green (apk.rs), badge Almost ready, CONTRIBUTING real warn.

## 2026-10-23 — Check evidence + PR comment footer
- `expectedCheckCommands`: CONTRIBUTING cmds filtered by repo markers (`Cargo.toml`/`package.json`/…); else infer (`cargo test` / `npm run build`).
- Copy-as-comment footer: “Scored by FirstPR. Score comes from rule checks; AI items are advisory.”

## 2026-10-23 — Pasted-diff N/A scoring
- Status `na`: Linked issue / Branch / Description / Check evidence → grey dash, “Only checked on a PR link”, out of score.
- `scoreChecks` drops N/A weights and scales remaining to 100.
- Summary: “Checked the diff only. Open a PR to check the rest.”

## 2026-10-23 — Pasted-diff CONTRIBUTING + AI score cap
- Prompt + user note: pasted diff → CONTRIBUTING judges only diff-visible rules; never fail for branch/body/checks; code demotes fail→warn unless forbidden failed.
- Score = rule + AI weights; any AI fail caps at 60 (floor 55 when rules clean).
- Footer: “Scored by FirstPR from rule checks and AI review of the diff.”

## 2026-10-23 — UI polish (no lib/API)
- Landing: hero tint+dots, trust line, 3-step strip, Match card; max-w-5xl / py-12 / gap-6 / blue-600 / slate / rounded-xl shadow-sm.
- `FlowProgress` on issue + review; spinners + skeletons while loading; empty Match copy.
- Mobile: full-width inputs, wrapping chips/nav; Enter submits forms; focus rings blue.

## 2026-10-23 — Forgiving Match repo field
- `parseRepo`: URL / owner/repo / bare (+ defaultOwner); friendly “Couldn't find that repo. Try owner/repo.”
- `resolveMatchRepo`: bare name tries username then `nishal21`.
- Verified: `NekoDroid`, `nishal21/NekoDroid`, full URL all pick an issue.

## 2026-10-23 — Match difficulty + filters
- Labels OR: good first issue, good-first-issue, beginner, easy, first-timers-only, starter (`BEGINNER_LABELS` + listForRepo).
- Skip: assigned, linked open PR (timeline), older than 1 year.
- `lib/difficulty.ts`: Gemma → OpenAI low; `{level,reason}`; prefer easy, Stretch=medium, hide hard. Do not cache LLM failures.
- Badge: Match card + Explain header via `DifficultyBadge` (Beginner-friendly | Stretch).
- Verified: NekoDroid #4 → Beginner-friendly; Graphify-Labs/graphify#3666 → Stretch.
- Script: `scripts/verify-difficulty-match.ts` (loads `.env`).

## 2026-10-24 — Explain limits notice
- Prompt + schema: `unsure_about` = 1–2 sentences, start “Heads up:”, what missing + which file to open/search; null if nothing missing; ban “supplied source excerpts” / “not shown”.
- `lib/limits-notice.ts` `formatLimitsNotice` cleans + hides empty/fluff; applied in `explain.ts`.
- UI: amber box only when cleaned text exists (no low-confidence-only fallback).

## 2026-10-24 — UI i18n (chrome only)
- Replaced pill/More toggle with globe + name dropdown (en / മലയാളം / हिन्दी).
- `lib/i18n.ts` dictionaries; `LanguageProvider` + `useT()`; localStorage `firstpr-lang`.
- All Home / Explain / Review chrome via `t("key")`. AI explain/hint/review text stays English.
- Fonts: Noto Sans Malayalam + Devanagari when ml/hi.

## 2026-10-24 — Lang switcher: no native select
- Globe + language + ChevronDown button; absolute dropdown w-40; Esc/outside/select close.

## 2026-10-24 — Lang menu clipped by nav
- Cause: `overflow-x-auto` on nav scrolled/clipped the menu (fake “select arrows”).
- Fix: LangToggle sibling of nav; portal menu to body with fixed coords.

## 2026-10-24 — Lang: 3 options, default English, nav unchanged
- Only en / ml / hi; `DEFAULT_UI_LANG = "en"`; storage ignores junk → English.
- Navbar layout restored (links + toggle); menu still portaled (z-200).

## 2026-10-24 — Major world languages in UI switcher
- `UI_LANGS`: en, ml, hi, ta, bn, es, fr, de, pt, zh, ja, ko, ar, ru, id.
- Dicts: `i18n-en.ts`, `i18n-ml-hi.ts`, `i18n-world.ts` (fill() onto en); index `i18n.ts`.
- Provider: `parseUiLang` for all codes; `uiLangFontClass`; ar → `dir=rtl`.
- Fonts: Noto Tamil/Bengali/SC/JP/KR/Arabic + existing ml/deva.
- Menu: `max-h-64` scroll, `w-52`. tsc clean.
- Why “still no change” on vercel.app: local only until redeploy.

## 2026-10-24 — Globe list look empty / “not changing”
- Cause: 15 langs were live but en/ml/hi sat on top; closed button only shows current lang.
- Fix: major langs first; taller scroll menu; separate `firstpr-ui-lang` key; pushed.

## 2026-10-24 — No Cursor co-author on commits
- Cursor was injecting `Co-authored-by: Cursor <cursoragent@cursor.com>`.
- Fixed latest commit (force-push clean message). CLI attribution off in cli-config.json.
- User should disable Cursor Settings → Git & PRs → Attribution so it stays off.

## 2026-10-24 — Unkillable demo
- Fixtures in `data/demo/` (15 JSON); DEMO_MODE on|auto; RECORD_DEMO=1 writes locally only
- Routes set `x-firstpr-source`; UI tiny “saved result” dot; friendly rate_limited/timeout/not_found
- Verified: DEMO_MODE=on → match / explain#4 / hints+refuse / review#1+#7 all cache 200

## 2026-10-24 — Theme / header / hero
- Blue palette tokens; sticky header with mark+wordmark; mobile Menu panel
- Hero eyebrow pill + primary CTA → #match; LangToggle unchanged (portal)
- Build: `npm run build` exit 0

## 2026-10-24 — 360px polish
- No page overflow at 360–1280 on /, explain, review; LangToggle ml/ar OK
- Theme tokens replace slate/white leftovers on listed components
- Build exit 0

## 2026-10-24 — Animated footer + brand icons + metadata
- Dark footer `#172235`, CSS glow 16s + logo float 4s under `prefers-reduced-motion: no-preference`
- `app/icon.png` + `app/apple-icon.png` from `public/brand/`; leave `favicon.ico`
- metadataBase / OG / twitter → `/brand/logo-full.png`; viewport `themeColor: #0473FD`
- i18n `footer.tagline` in en + ml/hi + all world packs; `footer.built` unchanged
- Verified: no x-scroll 360/1280; reduced-motion → anim none; build exit 0; og:image absolute URL

## 2026-10-24 — Favicon + footer scene
- Brand favicon in `app/favicon.ico`
- Scene photo removed — fade looked broken; footer is navy + logo/nav/built only

## 2026-10-24 — GitHub App webhook
- `@octokit/app` + `POST /api/github/webhook` (202 + `after()`, verify → 401)
- `/firstpr explain` on issues → explain + L1 hint comment; PR open/sync → score card comment
- Env: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
- Live: NekoDroid #4 got FirstPRbot reply (PEM must be full key on Vercel with `\n`)

## 2026-10-24 — FirstPRbot about on site
- Home `HomeBotSection` + footer blurb/link → https://github.com/apps/firstprbot
- i18n bot.* / footer.bot*; README rewritten for product + bot

## 2026-10-24 — Vercel readiness
- `cacheComponents`/`partialPrefetching` off so every `app/api` can `runtime = "nodejs"` + `maxDuration = 60`
- `GET /api/health` → `{ ok, demoMode, hasOpenAI, hasGitHub, rate }` (booleans only for secrets)
- `/api/debug` → 404 when `NODE_ENV` or `VERCEL_ENV` is production
- No client component imports `@/lib/env` or secrets; `npm run build` exit 0

## 2026-10-24 — Handbook docs
- `LICENSE` MIT 2026 Nishal K and Anan Shaji
- `README.md` AIBoomi 15 sections; `AI_IMPACT.md` ≤200 words
- Facts only from repo + user brief; placeholders for video/deck/contacts

## 2026-10-24 — 404 / error pages
- Brand `not-found.tsx`, `error.tsx` (i18n); `global-error.tsx` root crash UI
- Invalid issue number uses same 404-style layout

## 2026-10-24 — README + /firstpr review
- Users: final-year/fresh grads India + maintainers; 15-lang limitation wording; GitHub contacts
- Bot: `/firstpr review` on PRs → mentor-ready score card; auto on open/sync
- Need real demo video + deck URLs in README (not invented)

## 2026-10-24 — Source on GitHub
- Linked MIT repo in README Demo + site footer (`nishal21/firstpr`)
- i18n `footer.sourceLink` (en + packs)

## 2026-10-24 — One nav only
- Deleted `FlowProgress` from explain + review pages (duplicated header)
- Header: Find an issue / Explain / Review my PR stays

## 2026-10-24 — UI polish locked
- Hero pull-up + ink footer + arrow pills + PageIntro across flow pages
- Mobile: useNarrow shader props; no horizontal overflow at 390
- User: “everything is good” — no further UI changes needed this pass

## 2026-10-25 — License = AGPL-3.0
- Official AGPL-3.0 (not custom proprietary joke text)
- Allows personal + other noncommercial; no commercial without separate deal
- Touched: LICENSE, README, package.json license field, en/ml/hi/world footer strings

## Next for another agent
1. Deploy webhook; test `/firstpr review` on a NekoDroid PR
2. Commit when asked (license + any leftover footer moon tweak)

## 2026-10-29 — Search hero and Aperios footer
- Do not bring `ink-ridges` back into the footer. It was the lag. Footer motion is `.footer-marquee-track` in `app/globals.css` (translate3d only). `components/site-footer.tsx` sets `data-inview` / `data-hold` / `data-motion`. Animation stays paused until the footer intersects.
- Reference to keep: Aperios Design footer, https://aperios-design.co.uk/ (also on https://www.footer.design/styles/animated). Dirt’s glass word (https://dirtverse.co/) was rejected because the refraction is a filter.
- Search lives in `components/site-search.tsx` + `components/search-provider.tsx` (Ctrl/Cmd+K, header button). Parsing is `lib/omnisearch.ts` (`npx tsx scripts/verify-omnisearch.ts`). GitHub suggestions: `searchBeginnerIssuesByText` in `lib/github.ts`, route `app/api/search`.
- Flows: match user `/?user=#match`, topic `/?q=&lang=#match`, explain `/issue/owner/repo/n`, review `/review?pr=`, repo check `/repo/owner/repo`.
- New i18n keys must be added to `lib/i18n-en.ts` and both objects in `lib/i18n-ml-hi.ts`. World packs use `fill()` and pick up English automatically.
- Next: if the marquee stutters, change duration or pause it. Do not add blur, shadow animation, or a scroll listener. Preview branch is `redesign-footer-hero` (no pull request; Vercel builds the branch).

## 2026-10-29 — Hero pass, footer frozen
- Owner does not want more Aperios footer work. Leave `components/site-footer.tsx` and the marquee CSS until a new reference arrives.
- Phone header overflow was the language name plus menu. Mobile `LangToggle` is `compact` (globe only). Header padding is `px-3`.
- Headline key `hero.headline` is “Find your first issue.” Sub, chips, trust lines, and glimpse cards are in en/ml/hi. Search groups: `search.groupUnderstood`, `search.groupLive`, `search.groupRecent`. Recent queries live in localStorage `firstpr-recent-searches`.
- LCP: do not fade the h1 in from opacity 0. Noto faces use `preload: false`; Inter stays preloaded.

## 2026-10-29 — hellohello footer
- Owner rejected Aperios. New reference is ++hellohello (https://www.hellohello.is/): giant line, giant ©26, 3D mark behind the type, full-width bar, link row.
- Scene is `.footer-spin` / `.footer-tilt` in `app/globals.css`. Transform only. `data-inview` starts the spin; `data-hold` and `data-motion=off` stop it.
- Do not add blur to chase Buzz. Do not put the marquee back.
- The 3D mark lives in `.footer-scene-slot` under the headline, `overflow: hidden`, z-index 0. Do not absolute-position it over the h2. The headline and ©26 stay in the row above.

## 2026-10-29 — Turion footer
- hellohello and Aperios are rejected. Reference is Turion Space, https://www.turionspace.com/ : gradient, floating objects, columns, giant cropped word.
- Classes: `.site-footer`, `.footer-orb-*`, `.footer-giant`, `.search-popover`. Orbs pause via `data-inview` / `data-hold` / `data-motion`.
- Suggestions are portaled to `document.body`. Do not put the list back inside `.hero-tint` (`overflow-hidden` clips it).
- Do not leave a comma between the `<ul>` tag and `{rows.map}` in `site-search.tsx`. That comma rendered as a speck beside the panel.
- `.dark .site-footer` retints the gradient. The site has no theme toggle yet.
