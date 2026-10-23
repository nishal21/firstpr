# Devlog

## 2026-10-23 — Base app
Done:
- `.env.example`, `.gitattributes` (`* text=auto eol=lf`)
- `.gitignore`: ignore `.env`, `.env*.local`, `.cursor`; keep `.env.example`
- `lib/env.ts` (zod, secrets optional until call)
- `app/layout.tsx` shell + Sonner; `app/page.tsx` hero; stub `app/review/page.tsx`
Verify: `npm run build` and `npm run dev` → localhost:3000

## Next
- Match / explain / review route handlers + UI forms
