# Agent notes (PatentDrafter)

## After code changes

1. Run tests if logic changed: `node node_modules/vitest/vitest.mjs run`
2. **Do not run `npm run build` while `next dev` is on port 3000** — corrupts `.next` and causes HTTP 500.
3. **Always verify dev access before finishing:**
   - `node scripts/verify-localhost.mjs` → must print `OK` / HTTP 200
   - If FAIL: `node scripts/dev-restart.mjs` then verify again

OpenAI credentials: `.env.local` only (`OPENAI_API_KEY`, `OPENAI_MODEL`, optional `OPENAI_PROJECT_ID`).
