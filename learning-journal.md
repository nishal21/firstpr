# Learning journal

## 2026-10-23 — Base app shell
- App root is `firstpr/firstpr` (create-next-app nested under workspace).
- Env: soft zod parse in `lib/env.ts`; `requireOpenAIApiKey` / `requireGitHubToken` at call time so Vercel build does not need secrets.
- UI shell: Inter, top bar (FirstPR + blue dot), Find/Review nav, hero copy, footer, Sonner.
- Next: match/explain/review APIs and forms.

## Next for another agent
1. Wire `/` match form → `POST /api/match`.
2. Keep GitHub in `lib/github.ts`, LLM in `lib/llm.ts`, schemas in `lib/schemas.ts`.
3. Product rule: never write the user’s fix; hints only.
