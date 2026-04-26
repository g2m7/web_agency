# Manual Checklist For Current Uncommitted Changes

Use this list to manually check the full current worktree.

If a step is blocked by missing credentials or missing sample data, mark it `BLOCKED` and move on.

## 1. Basic verification

1. Run `cd app-lite && bun run typecheck`.
   Expected: it passes with `0` errors.

2. Run `cd app-lite && bun run test`.
   Expected: all tests pass.

3. Start the app with `cd app-lite && API_KEY_INTERNAL=test ENABLE_WORKERS=false bun run dev`.
   Expected: the app starts, the database initializes, and the log says recurring jobs are disabled.

## 2. Planning and handoff flow

4. Open [AGENTS.md](/Users/adityapaswan/soup/projects/web_agency/AGENTS.md) and [CLAUDE.md](/Users/adityapaswan/soup/projects/web_agency/CLAUDE.md).
   Expected: both files say the same thing about `handoff.md`, `/open-track`, `/close`, and the test gate.

5. Open [plans/README.md](/Users/adityapaswan/soup/projects/web_agency/plans/README.md) and [plans/MASTER_CHECKLIST.md](/Users/adityapaswan/soup/projects/web_agency/plans/MASTER_CHECKLIST.md).
   Expected: `foundation` is the active track and the track rules are clear.

6. Open [plans/foundation/HANDOFF.md](/Users/adityapaswan/soup/projects/web_agency/plans/foundation/HANDOFF.md) and [plans/foundation/MASTER_CHECKLIST.md](/Users/adityapaswan/soup/projects/web_agency/plans/foundation/MASTER_CHECKLIST.md).
   Expected: `PHASE-02` is active and the next action is clear.

## 3. Docs consistency

7. Skim [docs/README.md](/Users/adityapaswan/soup/projects/web_agency/docs/README.md), [docs/19-Application-Architecture.md](/Users/adityapaswan/soup/projects/web_agency/docs/19-Application-Architecture.md), and [docs/20-Application-Build-Test-Guide.md](/Users/adityapaswan/soup/projects/web_agency/docs/20-Application-Build-Test-Guide.md).
   Expected: they all say `app-lite` is the active codebase and `app/` is legacy.

8. Skim [docs/04-Lead-Generation-SOP.md](/Users/adityapaswan/soup/projects/web_agency/docs/04-Lead-Generation-SOP.md) and [docs/22-Niche-Hunting-SOP.md](/Users/adityapaswan/soup/projects/web_agency/docs/22-Niche-Hunting-SOP.md).
   Expected: lead generation now starts from an approved city+niche pair, not from a loose niche/city choice.

9. Skim [docs/12-KPIs-Dashboard.md](/Users/adityapaswan/soup/projects/web_agency/docs/12-KPIs-Dashboard.md) and [docs/13-Risk-Register.md](/Users/adityapaswan/soup/projects/web_agency/docs/13-Risk-Register.md).
   Expected: the scraper tab is described as the scorecard home, and lead-source compliance risk is documented.

## 4. App boot, auth, and database

10. Open `http://localhost:3006/`.
    Expected: the dashboard loads.

11. Call any `/api/*` endpoint without `x-api-key`.
    Expected: it returns `401 Unauthorized`.

12. Call the same endpoint with `x-api-key: test`.
    Expected: it returns normal data.

13. Confirm the app boot did not fail after database migration.
    Expected: new schema changes do not break startup.

14. Check the database shape with DB Studio or a quick query.
    Expected: these exist:
    `niche_city_pairs`, `leads.pair_id`, `deployments.lead_id`, `system_config.active_pairs`, `system_config.scraper_proxies`, `system_config.scraper_max_rpm`, `system_config.scraper_max_retries`, and `system_config.scraper_delay_ms`.

## 5. Scraper config and scorecard UI

15. Open the Scraper tab.
    Expected: there is a `City + Niche Scorecard` panel.

16. Read the current scraper config.
    Expected: you can see niche, cities, active pairs, proxies, rate limit, retries, and delay settings.

17. Update the scraper config and save it.
    Expected: the new values persist after refresh.

18. Score a new pair in the scorecard.
    Expected: a new row appears with score, maps count, weak site %, contactable %, status, and updated time.

19. Score the same pair again with different numbers.
    Expected: the existing row updates instead of creating a duplicate.

20. Click `Refresh` in the scorecard.
    Expected: the latest pair list reloads correctly.

21. Check the scraper stats area.
    Expected: it shows approved pair count and validated pair count.

## 6. Pair workflow and lead generation

22. Click `Validate` on a pair.
    Expected: a mini-validation `lead_gen` job is queued.

23. After validation runs, inspect the pair record.
    Expected: it stores `last_scrape_job_id`, validation metadata, sampled lead counts, threshold reasons, and the human review flag when needed.

24. Click `Decide` on one of the first few pairs.
    Expected: the pair status updates correctly and the decision metadata is stored.

25. Click `Run` on a single pair.
    Expected: one `lead_gen` job is queued for that pair only.

26. Click `Run Approved Pairs`.
    Expected: only approved pairs are queued.

27. Inspect leads created by a pair-based run.
    Expected: each new lead keeps the correct niche, city, state, source, and `pair_id`.

28. Open scraper results and filter by pair.
    Expected: only leads from that pair are shown.

29. Check the contact-mode filters in results.
    Expected: `email`, `phone_only`, and `unreachable` still behave correctly.

## 7. Handler behavior

30. Trigger `follow_up_1` or `follow_up_2` for a lead in `contacted` status.
    Expected: a draft interaction is created and nothing is sent automatically.

31. Trigger `demo_build`.
    Expected: a demo deployment record is created with a content snapshot, QA placeholders, and human approval still off.

32. Trigger `onboarding`.
    Expected: a welcome draft is created, an initial launch deployment is created, and the first monthly report job is queued.

33. Trigger `monthly_report`.
    Expected: a monthly report draft is created for active clients.

34. Trigger `churn_check`.
    Expected: at-risk clients get retention drafts, and duplicate open retention drafts are not created.

35. Trigger `support_auto_reply` with normal support text.
    Expected: an acknowledgement draft is created.

36. Trigger `support_auto_reply` with legal, angry, refund, chargeback, or cancel language.
    Expected: the interaction is escalated instead of auto-replied.

37. Trigger `billing_retry`.
    Expected: a payment reminder draft is logged, and on the last retry a `payment_failed` client can move to `grace_period`.

38. Trigger `site_qa`.
    Expected: QA metadata is saved, and a data isolation failure marks the deployment as failed.

## 8. Webhooks

39. Send a Dodo success payload.
    Expected: a billing event is recorded and the client can move into the correct active/onboarding path.

40. Send a Dodo payment failure payload.
    Expected: a billing event is recorded and an active client can move to `payment_failed`.

41. Send a Dodo cancellation payload.
    Expected: the client becomes `cancelled`, and cancellation reason/timestamp are saved when needed.

42. Send the same Dodo payload twice.
    Expected: the second call is treated as already processed.

43. Send a Cloudflare payload without `metadata.deployment_id`.
    Expected: it returns a safe `no_deployment_id` response.

44. Send a Cloudflare success payload for a real deployment.
    Expected: deployment status becomes `deployed`, preview URL updates when present, and `deployed_at` is set.

45. Send a Cloudflare failure payload for a real deployment.
    Expected: deployment status becomes `failed`.

46. Send a Cloudflare payload for a missing deployment.
    Expected: it returns `deployment_not_found`.

## 9. Final smoke check

47. Refresh the dashboard after running the checks above.
    Expected: scraper stats, scorecard, jobs, and results still load without console errors.

48. Re-open [handoff.md](/Users/adityapaswan/soup/projects/web_agency/handoff.md) and [plans/foundation/HANDOFF.md](/Users/adityapaswan/soup/projects/web_agency/plans/foundation/HANDOFF.md).
    Expected: they still match the current phase, current test state, and next work item.
