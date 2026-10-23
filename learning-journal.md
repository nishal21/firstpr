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

## Next for another agent
1. Wire `/` match form → `POST /api/match`.
2. Add real schemas in `lib/schemas.ts`; product rule: never write the user’s fix.
