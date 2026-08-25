# Live verification notes

- The branded login route rendered in the local Expo web preview with the Lumière House palette.
- The first signup attempt created the account but the web session did not persist because the scaffold intentionally skipped web token storage while the preview and API use different origins.
- Fixed this by storing the local session token with AsyncStorage on web and attaching it as a bearer token for API calls on all platforms; cookies remain enabled for OAuth/browser sessions.
- After the fix, login with `lumiere.test.2026.0825@example.com` and the test password successfully transitioned to the real onboarding route.
- A development test account was created in the managed database during verification; no production data was used.


- After a full page reload and a fresh login, the auth REST call returned 200 with the bearer session, and the app correctly reached onboarding.
- The onboarding submit still returned `Please login (10001)`, which isolates the remaining issue to the tRPC request path or session header propagation rather than the login route itself. The next fix will instrument the tRPC link and validate the request against the protected procedure directly.


- The verified `gpt-5-mini` structured-output request returned a valid JSON response in an independent server probe.
- A fresh Content Studio run created a real persisted draft, returned a substantive caption/body/visual brief, and calculated a quality score of 8/10 with a `review` decision and dimension-level scores.
- The draft detail screen displayed critique and weaknesses, and “Submit for human approval” moved the item to `pending approval`.
- The approval inbox displayed the pending item and the Approve action moved it to `approved`. The UI explicitly stated that approval does not publish anything without an authorized connector and schedule.
- The first-generation failure remains persisted as a blocked draft, which is the intended truthful failure record; later generation succeeded after the strict JSON/model fix.


- The approval workflow was verified live: a pending approval was created from the content detail screen and approved in the inbox without triggering external publication.
- Client Care rendered with its consent guardrails and a real Add a client form. The live form accepted a name, email, and segment; explicit consent controls are present for unknown, granted, and revoked states.


- Automate accepted a real recipe, persisted it as paused/disabled with approval required, and recorded a blocked run stating that no message or post was sent because no authorized outbound connector exists.
- Connect displayed all providers as authorization required. A booking-system connect attempt returned a visible truthful message that official OAuth is not configured and no connector was connected.
- Analytics accepted an explicitly recorded booking event with value 4 and updated the event count and history. Insights remained at zero because there is not yet enough evidence for a learning signal.


- Password reset was verified end to end: the request returned the expected development-only token state because email delivery is not configured, the confirmation route accepted a valid replacement password, and login with the replacement password returned to the protected workspace.
- Settings displayed real workspace/account controls and the logout action returned the app to the login route.


- A second workspace, Lumiere Events House, was created from Settings and became the active tenant. Its Today screen showed 0 goals, 0 drafts, 0 needs review, and no connected providers, while the original Lumiere Wellness Studio workspace retained its own data when selected again. This verifies tenant-scoped UI reads and switching behavior.
