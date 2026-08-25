# Lumière House Mobile Interface Design

## Product intent

Lumière House is a calm, premium business operating system for small-business marketing. The mobile experience should help an owner answer one question quickly: **what marketing action matters most right now?** The visual system uses the specification's near-black `#14100E`, warm cream `#F3E9DD`, rose gold `#B8895F`, and ember `#C1432A` as a restrained product-software palette rather than a fashion treatment.

The app is designed for **portrait 9:16 screens and one-handed use**. Primary actions sit in the lower half of the screen or are reachable from a bottom tab bar. Important information is progressively disclosed: a concise recommendation first, then rationale, assumptions, and approval requirements in a detail view or sheet.

## Screen list

| Screen | Primary content and functionality |
|---|---|
| Welcome / Sign in | Email/password entry, sign in, create account, forgot password, and a clear route into authenticated workspace setup. |
| Create account | Name, email, password, and consent fields with real validation and submission feedback. |
| Reset password | Email submission for reset link, plus a confirmation state that does not imply a reset happened before the server confirms it. |
| Workspace setup | Business name, business type, location/timezone, primary goal, target period, current performance, and target. Creates the first isolated workspace. |
| Workspace switcher | Current workspace identity, available workspaces, create workspace action, and explicit loading/error states. |
| Today | Top three prioritized actions, opportunity / risk summary, pending approvals, follow-ups, open slots, and recommendation details showing why, action, expected impact, confidence, and approval requirement. |
| Growth | Goal entry and goal detail; target, forecast, assumptions, and actual are visually separated. Includes opportunity, lead, booking, rebooking, campaign, experiment, offer, and recommendation sections. |
| Client Care | Client segments, timeline, inactive customers, overdue rebooking, suggested follow-ups, review requests, notes, consent, quiet-hours, preferences, and campaign history. |
| Client detail | Customer timeline, contact preferences, consent status, notes, past campaigns, and review / rebooking recommendations. Sensitive outbound actions require approval. |
| Content Studio | Outcome-first creation form: desired outcome, offer, platform, campaign, message, CTA, and content type. It does not expose model selection. |
| Content result | Platform-specific draft(s), generation status, quality score dimensions, identified weaknesses, improvement action, revision history, and approval control. |
| Approval queue | Content and sensitive outreach items awaiting review, with approve, request changes, and reject actions that update persisted state. |
| Automate | Automation recipes, triggers, conditions, quiet hours, consent guardrails, approval requirements, run history, and enable/disable controls. |
| Connect | Connector catalog and connection status for supported channels. Shows unavailable credentials as a truthful blocked state and never simulates a connection. |
| Analytics | Actual performance events, campaign results, content performance, goal progress, and learning recommendations. Empty states explain what data is needed. |
| Settings | Workspace profile, brand voice, customer permissions, notification preferences, security, sign out, and workspace administration. |
| Help | Short product guidance, policy notes, and a route to support/contact without dead-end controls. |

## Primary navigation

The main tab bar has six destinations: **Today, Growth, Client Care, Content Studio, Automate, and Connect**. The selected tab uses rose gold with a high-contrast label. Settings, Help, Analytics, and account/workspace controls are accessible from the Today header and account sheet; Analytics is also reachable from Growth's secondary navigation so the primary bar remains focused.

On narrow devices, tab labels remain visible and the bar uses safe-area padding. On wider screens, the content column remains readable at a deliberate maximum width with a quiet side rail for workspace context rather than stretching cards across the viewport.

## Layout and component rules

Each screen uses a warm-cream background with near-black text and sparse surfaces. The top area contains one clear title and, where useful, the current workspace. Sections are separated by whitespace and fine `#D8C9BA` borders. Cards are reserved for decisions, summaries, and records that users can act on; decorative card grids are avoided.

Primary buttons use near-black fills with cream labels. Secondary actions use a transparent or cream surface with a thin border. Ember is reserved for risk, destructive actions, and blocked states. Rose gold highlights selection and progress. All Pressable controls include visible pressed feedback and accessibility labels. Forms use large touch targets, inline validation, keyboard-safe scrolling, and explicit loading/error states.

Recommendations use a compact pattern:

> **What matters** → **Why now** → **Do this** → **Expected impact** → **Confidence** → **Approval needed**

Quality and forecast views use horizontal bars or compact rows rather than radial charts. Every forecast is labeled as a forecast, with assumptions directly adjacent. Actuals are never presented from hard-coded values; when no persisted data exists, the UI says so.

## Key user flows

### First workspace setup

1. The user chooses Create account, submits validated credentials, and receives confirmed server feedback.
2. The user enters the business profile and initial goal.
3. Lumière House creates a workspace and membership, then shows the Today command center for that workspace.
4. The user can switch workspaces from the account sheet; all records query through the active workspace boundary.

### Outcome to campaign

1. From Today or Growth, the user taps a recommendation or starts a goal.
2. The user enters or confirms goal, period, current performance, and target.
3. The app stores the goal and presents explicit target, forecast, assumptions, and actual sections.
4. The user chooses Create marketing work, selects the intended outcome and platform, and submits a content request.
5. The server creates a persisted draft and quality review record; the app shows generation / review status rather than claiming completion.
6. The user opens the result, reviews platform-specific output and quality weaknesses, and requests improvement or moves it into approval.

### Content quality and approval

1. The user opens a draft from Content Studio or Approval queue.
2. The content view shows each quality dimension from the internal 0–10 framework, critique notes, and overall status.
3. The user can request changes, creating a new persisted revision, or submit for approval.
4. An authorized reviewer approves or rejects the item. The status changes on the server and the queue refreshes.
5. Publishing remains unavailable until a real connector is connected and the approval state permits it; unavailable capabilities are explained rather than simulated.

### Client care follow-up

1. The user opens Client Care and selects a segment or client.
2. The timeline shows persisted interactions, consent, quiet hours, preferences, and campaign history.
3. Lumière House can create a suggested message as a reviewable draft.
4. Any outbound action checks consent, quiet hours, permissions, and connector availability. The app requires approval where configured and reports the actual result from the server.

### Automation

1. The user opens Automate and chooses a recipe such as overdue rebooking or review request.
2. The user defines trigger, audience, quiet hours, and whether approval is required.
3. The app persists the automation and shows its actual enabled state and run history.
4. A run can only execute through available server-side capabilities and connectors; otherwise the run is recorded as blocked with a truthful explanation.

## Color choices

| Token | Value | Usage |
|---|---|---|
| Near-black | `#14100E` | Primary text, primary actions, deep navigation surfaces |
| Warm cream | `#F3E9DD` | Main background, primary button text, light-on-dark contrast |
| Rose gold | `#B8895F` | Active tabs, progress, selected controls, subtle emphasis |
| Ember | `#C1432A` | Risks, overdue items, destructive actions, blocked or critical states |
| Soft sand | `#E8DCCF` | Secondary surfaces and input fills |
| Border taupe | `#D8C9BA` | Dividers, card outlines, input borders |
| Forest | `#496451` | Confirmed, approved, and healthy states |
| Ink secondary | `#6E6259` | Supporting copy and metadata |

Dark mode keeps near-black as the base and shifts warm cream to a readable light surface while preserving rose gold and ember as accents. Contrast is checked for text and controls, and color is never the sole indicator of status.

## Interaction and accessibility

The app follows mainstream iOS conventions: familiar navigation, safe-area handling, sheets for contextual actions, predictable back behavior, native keyboard dismissal, and concise system feedback. Tap targets are at least 44 points where practical. Dynamic text should not be clipped. Empty, loading, success, blocked, and error states are distinct. Every destructive action requires confirmation; every sensitive action explains the approval boundary before submission.

## Implementation priorities

The first production foundation prioritizes authenticated workspace isolation, Today, Growth goals, Content Studio drafts, quality review, approval state transitions, and honest connector/automation boundaries. Secondary modules are added only when their persisted data and server action exist, so no visible control is left pretending to work.

## Validation targets

The design must be checked at a narrow portrait viewport, a tablet-like viewport, and desktop web preview. The validation pass should verify safe-area spacing, keyboard-safe forms, tab reachability, long content scrolling, readable labels, and that every visible action either completes a real persisted operation or clearly explains why it is blocked.
