/**
 * Where "/" should send someone, given what is currently known.
 *
 * Pure and separate from the screen so the rule can be tested directly. The
 * bugs this encodes are both timing-shaped — a wrong answer lasts one render
 * and then corrects itself, by which time a redirect has already fired — so
 * asserting on the settled UI would never catch them.
 *
 * Two rules matter more than the rest:
 *
 * - "Not loaded yet" is not "no workspace". Redirecting to onboarding while
 *   the lookup is still in flight sent users who had just finished onboarding
 *   back to step 1 with their answers gone, and their workspace already
 *   created.
 * - "Lookup failed" is not "no workspace" either. Falling through to
 *   onboarding on an error invites a second, duplicate workspace.
 */
export type EntryDestination = "loading" | "landing" | "workspace-error" | "onboarding" | "app";

export function resolveEntryDestination(input: {
  authLoading: boolean;
  isAuthenticated: boolean;
  /** True until the workspace lookup resolves. Meaningful only when authenticated. */
  workspaceLoading: boolean;
  workspaceError: boolean;
  hasWorkspace: boolean;
}): EntryDestination {
  if (input.authLoading) return "loading";
  // Checked before the workspace flags: while signed out the lookup is
  // disabled and stays permanently unresolved, which is not something to wait
  // on.
  if (!input.isAuthenticated) return "landing";
  if (input.workspaceLoading) return "loading";
  if (input.workspaceError) return "workspace-error";
  return input.hasWorkspace ? "app" : "onboarding";
}
