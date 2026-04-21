# handoff.md

## What was done (this session)
- Committed previous agent's work: DbClient abstraction, Drizzle ORM layer, app-lite Bun variant (97 files, commit `227628c`)
- Updated AGENTS.md and CLAUDE.md: marked `app-lite/` as active codebase, `app/` as legacy (do not edit)
- Added handoff rule to AGENTS.md and CLAUDE.md: read handoff.md before every prompt, update at end of every session
- Created `app-lite/src/scraper/google-maps.ts`: browser-mimicking Google Maps scraper
  - Anti-detection: rotating User-Agents, Sec-Ch-Ua headers, realistic Accept/Accept-Language, random delays
  - Parser: hex place ID extraction, quoted-string business name detection, regex for phone/address/website/coords
  - Deduplication: `buildNicheCityKey()` generates unique `niche:city:businessname` keys
- Wired `handleLeadGen` in `app-lite/src/jobs/handlers/index.ts` to the real scraper
  - Reads config (niche, cities), scrapes each city, deduplicates via `niche_city_key`, inserts leads
  - Returns `leads_created`, `leads_skipped`, `errors` instead of stub message
- Added tests: `app-lite/tests/unit/scraper/google-maps.test.ts` and `app-lite/tests/unit/handlers/lead-gen.test.ts`

## What's in progress
- **app-lite typecheck + test run** — need to verify `bun run typecheck` and `bun run test` pass
- **app/ scraper files** — the `app/src/scraper/` and `app/tests/unit/scraper/` files were created in error; they should be cleaned up or just left as legacy reference

## What's blocked
- Scraper has not been tested against a live Google Maps request — the parser works on mock HTML but real Google Maps HTML may have a different structure. Needs a live smoke test.
- The `app/` scraper and handler changes from earlier in this session have type errors (were in-progress when pivot to app-lite happened). The `app/` changes should be reverted or ignored since `app/` is now legacy.

## Where the next agent should pick up
1. Run `bun install && bun run typecheck && bun run test` inside `app-lite/` and fix any errors
2. Do a live smoke test of the scraper: `scrapeGoogleMaps('hvac', 'Austin', 'TX')` and verify real business data comes back
3. If parser needs adjustment for real Google Maps HTML, update `extractQuotedStrings` and `extractBusinessFromChunk` patterns
4. Implement the next handler: `follow_up_1` (draft & send follow-up emails via Resend)
5. Clean up the `app/src/scraper/` and `app/tests/unit/scraper/` files (wrong codebase), or leave as legacy
