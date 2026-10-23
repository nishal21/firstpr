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

## Next for another agent
1. Wire `/` match form → `POST /api/match`.
2. Confirm Neysa tag when endpoint + key work.
