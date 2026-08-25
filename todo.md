# Project TODO

- [x] Initialize a clean Lumière House Expo mobile project
- [x] Create the mobile-first interface design plan
- [x] Record the master build scope in the project TODO
- [x] Establish the branded visual system and generated app icon
- [x] Configure app name, slug preservation, icon assets, splash assets, and favicon
- [x] Read and apply the mobile backend documentation before server/database work
- [x] Implement email/password signup with validation and real server feedback
- [x] Implement login with real session handling
- [x] Implement logout and session cleanup
- [x] Implement password reset request and confirmed response states
- [x] Implement workspace creation and onboarding
- [x] Implement multi-tenant workspace membership boundaries
- [x] Implement workspace switching
- [x] Implement database schema and migrations for users, workspaces, memberships, goals, clients, campaigns, content, quality reviews, approvals, automations, connectors, and analytics events
- [x] Implement workspace-isolated CRUD operations and API routes
- [x] Implement Today command center with persisted recommendations and top-three prioritization
- [x] Implement Growth goals with target, forecast, assumptions, and actual separation
- [x] Implement lead, booking, opportunity, rebooking, campaign, experiment, and offer foundations
- [x] Implement Client Care segments, timelines, notes, consent, preferences, quiet hours, and follow-up drafts
- [x] Implement outcome-first Content Studio creation flow
- [x] Implement platform-specific content drafts for supported social platforms
- [x] Implement content revisions and persisted generation status
- [x] Implement AI orchestration through the built-in server-side LLM capability
- [x] Implement the quality engine with critique, 0-10 dimensions, weaknesses, improvement, and rescoring
- [x] Implement approval queue and real approval state transitions
- [x] Implement truthful publishing/connectors boundary with no simulated integrations
- [x] Implement automation recipes, guardrails, enablement, and run history
- [x] Implement analytics event capture and actual performance views
- [x] Implement learning and optimization recommendation foundations
- [x] Implement settings, account controls, help, and security boundaries
- [x] Implement responsive portrait mobile UI and desktop web preview layout
- [x] Add deterministic unit and integration tests for core workflows and API routes
- [x] Verify signup, login, logout, password reset, onboarding, workspace isolation, database operations, marketing workflows, content creation, quality checking, approval, error handling, and responsive behavior
- [x] Run typecheck, lint, test suite, and production build
- [x] Save the final checkpoint
- [ ] Deploy through the managed publish flow when available
- [x] Report what is built, verified, deployed, blocked, and needed from the user

- [x] Add richer performance import entities and audit history
- [x] Add connector-authorized performance import API with truthful blocked states
- [x] Add manual CSV-style performance event import with validation and no fabricated metrics
- [x] Add bounded schedule entities and schedule run history
- [x] Add approval, quiet-hour, action-limit, and connector guards to scheduling
- [x] Add mobile performance import and scheduling screens
- [x] Add deterministic tests for import validation, tenancy, and schedule guards
- [x] Verify import and scheduling flows on mobile and desktop layouts
- [x] Save the updated checkpoint for performance imports and scheduling

- [x] Audit Supabase/PostgreSQL versus local JSON/in-memory persistence and remove unsafe production fallbacks
- [x] Verify session-to-user-to-workspace resolution across refresh and logout/login
- [x] Verify every business API route enforces membership and resource tenant scope
- [x] Standardize TikTok client key, secret, and redirect URI configuration with diagnostics
- [x] Move OAuth state to durable protected storage and preserve server-side token secrecy
- [x] Add durable retryable, idempotent, cancellable, tenant-scoped job records
- [x] Add rate limiting, request IDs, structured logging, webhook verification, and health checks
- [x] Add tenant-isolation and integration coverage for the audit requirements
- [ ] Verify mobile and desktop UI plus production deployment build
- [x] Save the repaired audit checkpoint

## Continuation hardening

- [x] Complete real login-refresh-workspace-logout-login E2E coverage
- [x] Implement supported webhook signature and replay verification without inventing unconfigured providers
- [x] Add production-safe rate limiting to auth, OAuth, AI, jobs, publishing, and webhook boundaries
- [x] Prepare connector-authorized performance import worker with idempotency, cancellation, retries, timestamps, and source/platform metadata
- [x] Verify TikTok configuration diagnostics for missing and malformed values without exposing secrets
- [x] Run final security, session, isolation, health, OAuth-failure, and production regression verification
- [x] Save the continuation hardening checkpoint and report fixed, verified, blocked, needed, and next items

## Final production validation

- [x] Determine and run the supported native production build, or document the exact environment blocker
- [x] Implement durable observable cleanup for expired rate-limit buckets and webhook receipts
- [x] Verify approved-provider connector import readiness without fabricating provider data
- [x] Run the complete auth, persistence, authorization, OAuth, webhook, rate-limit, queue, connector, error, build, and UI regression suite
- [x] Complete the final production-readiness review and save the final checkpoint

## Product build continuation

- [x] Audit Today, Growth, Client Care, Content Studio, Automate, Connect, Results, onboarding, quality, and approval workflows against the attached product specification
- [x] Implement the highest-value missing customer-facing workflow slice with persisted API behavior
- [x] Preserve truthful blocked states for unauthorized connectors and external actions
- [x] Add feature-level deterministic and real workflow coverage for the implemented slice
- [x] Verify responsive desktop and mobile behavior for the implemented product workflow
- [x] Save the product-build checkpoint and report built, verified, blocked, needed, and next work

## Finalization continuation

- [x] Re-inspect the latest Results, connector, security, auth, workspace, production, and responsive state against the attached finalization specification
- [x] Implement the highest-value truthful campaign-level Results breakdown supported by persisted data
- [x] Complete one-provider connector lifecycle architecture with pending, connected, failure, retry, audit, and tenant-safe boundaries
- [x] Complete the remaining safe security audit fixes without weakening existing protections
- [x] Run the realistic full customer-journey HTTP E2E with refresh/restart, workspace isolation, unauthorized access, Results, Settings, and connector status
- [x] Run final typecheck, lint, unit/integration/API/security/connector/Results tests, responsive checks, production build, and server smoke tests
- [x] Document production-readiness scores, remaining blockers, and the next single action
- [ ] Save the finalization checkpoint and deliver the short requested report

## Final integration continuation

- [x] Inspect current campaign, Results, workspace, connector, deployment, and test contracts against the attached integration brief
- [x] Implement workspace-safe campaign creation using the existing campaigns, goals, content, workspace, and analytics models
- [x] Add truthful period-over-period Results comparisons where persisted evidence supports them
- [x] Verify the TikTok OAuth, retry, audit, tenant, import, and publishing boundaries without claiming external authorization
- [x] Prepare and verify the managed publishing prerequisites without publishing unless the managed flow is explicitly available
- [x] Run the complete customer journey and final typecheck, lint, tests, production build, security smoke tests, and server smoke test
- [ ] Save the final integration checkpoint and deliver the concise requested report

## Launch preparation continuation

- [x] Perform the final production audit across auth, database, isolation, sessions, routing, APIs, errors, security, Results, campaigns, Settings, connectors, responsive UI, environment, build, and migrations
- [x] Fix only safe launch-blocking issues and document exact managed Publish and TikTok authorization boundaries
- [x] Verify required production environment variables without inventing or exposing secrets
- [x] Run all tests, typecheck, lint, production build, production server smoke, auth, isolation, Results, campaign, responsive, and security checks
- [ ] Save the launch-preparation checkpoint and deliver the concise requested report

## Final web deployment

- [ ] Verify the actual production origin and configure ALLOWED_ORIGINS without inventing a domain
- [ ] Verify production environment, database migrations, CORS readiness, and final smoke checks with TikTok disconnected
- [ ] Reach the managed Publish authorization boundary and stop for explicit user authorization if required
- [ ] If published, verify landing, auth, workspace, Today, Growth, campaign creation, Results, Settings, refresh persistence, authorization boundaries, and mobile layout
- [ ] Save the deployment checkpoint and report the exact launch status

## Video-ShotCraft integration

- [x] Audit Video-ShotCraft license, commercial-use rights, dependencies, Remotion/Node/runtime requirements, rendering requirements, recipes, template, and legal suitability
- [x] Audit Lumière video/job/storage/approval/tenant boundaries and define an isolated worker contract
- [ ] Integrate one isolated deterministic Remotion worker only if legal and technical prerequisites pass
- [ ] Verify worker build, real MP4 render, persistence, approval queue, tenant isolation, retries, failed jobs, cancellation, and mobile preview
- [ ] Report what ShotCraft, Remotion, AI assets, and Lumière each do, plus remaining gaps

## Video engine legal and technical gate

- [ ] Verify Video-ShotCraft Apache-2.0 scope and separate asset/license notices
- [ ] Verify Remotion license terms for commercial server-side automation and SaaS delivery
- [ ] Assess required infrastructure and ongoing cost without purchasing or installing anything
- [ ] Compare a genuinely free/open-source deterministic rendering alternative
- [ ] Deliver the legal and technical recommendation with Lumière unchanged

- [ ] Research free-first video-worker stacks and verify commercial-use rights
- [ ] Compare Motion Canvas, FFmpeg, and other self-hostable rendering alternatives
- [ ] Design an isolated queue-based 9:16 proof-of-concept without integrating it into Lumière
- [ ] Deliver free-first video architecture assessment and recommendation

## Isolated Motion Canvas + FFmpeg proof of concept

- [x] Create separate video-worker repository/project outside Lumière production code
- [x] Define versioned tenant-safe job manifest, local private storage, and durable job-state abstractions
- [x] Implement one 9:16 product-marketing template with captions, transitions, motion, and audio support
- [x] Add dependency/license audit and future Lumière integration contract documentation
- [x] Add validation, security, idempotency, retry, cancellation, cleanup, and output tests
- [ ] Run typecheck, lint, unit/security tests, real render, output validation, resource measurement, retry, cancellation, and cleanup verification
- [ ] Report isolated proof-of-concept status and confirm Lumière remains unchanged

## Controlled Motion Canvas renderer comparison

- [ ] Inspect installed Motion Canvas 3.17.2 packages and supported headless exporter path
- [ ] Create smallest isolated Motion Canvas render test without changing the fallback renderer
- [ ] Benchmark Motion Canvas against SVG/Resvg/FFmpeg for media metadata, timing, reliability, and repeatability
- [ ] Deliver the controlled renderer comparison decision and smallest next step

## Final browser-backed Motion Canvas feasibility test

- [ ] Inspect Chromium and Motion Canvas browser runtime entrypoints
- [ ] Create one isolated browser-backed scene-evaluation probe
- [ ] Capture and hash one genuine Motion Canvas scene frame and test repeatability
- [ ] Report final Motion Canvas feasibility and recommendation without production changes

## Lumière capability audit

- [ ] Audit all 22 requested Lumière capability areas against source and verified behavior
- [ ] Cross-check current tests, HTTP E2E, smoke evidence, and runtime state
- [ ] Identify the smallest remaining first-production-release work
- [ ] Deliver factual capability audit and readiness score without product changes

## Frozen managed web MVP production validation

- [ ] Verify exact production origin and ALLOWED_ORIGINS readiness without inventing or changing values
- [ ] Re-run complete Lumière validation suite and available HTTP/customer/security smoke checks
- [ ] Assess operational launch requirements, connector boundary, and controlled-pilot readiness
- [ ] Deliver final frozen-MVP production validation report and stop

## Frozen MVP release gate

- [ ] Verify managed production origin and release authorization state without guessing or changing configuration
- [ ] Run complete local pre-release, health, smoke, security, and tenant-isolation checks
- [ ] Stop at the managed Publish authorization boundary if user action is required
- [ ] Report deployment and controlled-pilot readiness accurately

## New Vercel configuration audit

- [ ] Inspect goalmind7-sudo/Lumiere-House1 framework, scripts, runtime, schema, and environment references
- [ ] Classify exact environment variables by visibility and source ownership
- [ ] Determine Vercel settings and migration prerequisites without deploying
- [ ] Deliver configuration report and stop for approval

## New canonical Lumière repository migration

- [ ] Verify current source baseline and new repository state
- [ ] Copy source, manifests, schema, migrations, configuration, and documentation without secrets or generated state
- [ ] Verify new repository buildability and exact environment-variable contract
- [ ] Commit the source to goalmind7-sudo/Lumiere-House1 main branch
- [ ] Report commit and repository configuration, then stop before deployment
