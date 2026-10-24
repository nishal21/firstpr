# AI impact statement

FirstPR uses AI to match beginners to open good first issues, explain those issues in plain language with file and line pointers, give leveled hints that refuse to write the fix, and help review a PR against the issue and CONTRIBUTING.md. Scoring and rule checks stay in code; the model fills structured fields that the app validates.

Models: OpenAI Responses API with `OPENAI_MODEL` / `OPENAI_REVIEW_MODEL` (default `gpt-6-luna`) for explain, hints, difficulty, review, and JSON. Optional Neysa Gemma and Qwen can pick files before an OpenAI fallback. Choice follows env keys and structured-output needs.

Data: public GitHub content read live through the REST API. No user database. Committed demo fixtures come from the MIT-licensed public repo nishal21/NekoDroid.

Guardrails: verify line citations against the real file and drop bad ones; refuse code-for-me hints and filter code-like text; keep deterministic checklist fails; surface an unsure note when confidence is low. Evaluation is fixture demos, manual NekoDroid runs, and build checks, not a formal offline benchmark.

Impact: beginners get guidance without handing off authorship; maintainers may see clearer first PRs. Risks include misread issues, rate limits, and uneven non-English UI quality. Scope is public repos and educational use at AIBoomi Startup Weekend Kochi.
