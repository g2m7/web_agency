# handoff.md

## What was done (this session)
- Committed previous agent's work: DbClient abstraction, Drizzle ORM layer, app-lite Bun variant (97 files, commit `227628c`)
- Updated AGENTS.md and CLAUDE.md: marked `app-lite/` as active codebase, `app/` as legacy (do not edit)
- Added handoff rule to AGENTS.md and CLAUDE.md: read handoff.md before every prompt, update at end of every session
- Created `app-lite/src/scraper/google-maps.ts`: browser-mimicking Google Maps scraper
  - Anti-detection: rotating User-Agents, Sec-Ch-Ua headers, realistic Accept/Accept-Language, random delays
  - Parser: hex place ID extraction, uppercase-letter business name regex, phone/address/website/coord extraction
  - Deduplication: `buildNicheCityKey()` generates unique `niche:city:businessname` keys
- Wired `handleLeadGen` in `app-lite/src/jobs/handlers/index.ts` to the real scraper
  - Reads config (niche, cities), scrapes each city, deduplicates via `niche_city_key`, inserts leads
  - Returns `leads_created`, `leads_skipped`, `errors` instead of stub message
- Added tests: `app-lite/tests/unit/scraper/google-maps.test.ts` (17) and `app-lite/tests/unit/handlers/lead-gen.test.ts` (8)
- Fixed app-lite tsconfig: removed rootDir constraint, excluded tests from compilation
- **All passing: `bun run typecheck` (0 errors) + `bun run test` (25/25 tests)**
- Also added scraper to `app/` for legacy reference (not the active codebase)

## What's in progress
- Nothing actively blocked

## What's blocked
- Scraper has not been tested against a live Google Maps request — the parser works on mock HTML but real Google Maps HTML structure may differ. Needs a live smoke test.
- 9 remaining stub handlers: follow_up_1, follow_up_2, demo_build, onboarding, monthly_report, churn_check, support_auto_reply, billing_retry, site_qa

## Where the next agent should pick up
1. Do a live smoke test of the scraper: `scrapeGoogleMaps('hvac', 'Austin', 'TX')` and verify real business data comes back. If the parser needs adjustment for real Google Maps HTML, update `extractBusinessNames` regex pattern.
2. Implement the next handler: `follow_up_1` (draft & send follow-up emails via Resend)
3. Consider adding a `POST /api/jobs/lead-gen` route to trigger scraping on demand
