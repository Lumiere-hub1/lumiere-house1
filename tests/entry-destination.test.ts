import { describe, expect, it } from "vitest";
import { resolveEntryDestination } from "../shared/entry-destination";

const base = { authLoading: false, isAuthenticated: true, workspaceLoading: false, workspaceError: false, hasWorkspace: true };

describe("resolveEntryDestination", () => {
  it("waits while authentication is still resolving", () => {
    expect(resolveEntryDestination({ ...base, authLoading: true })).toBe("loading");
  });

  it("shows the public landing page when signed out", () => {
    expect(resolveEntryDestination({ ...base, isAuthenticated: false, hasWorkspace: false })).toBe("landing");
  });

  it("does not wait on the workspace lookup while signed out", () => {
    // Signed out the query is disabled and never resolves, so treating it as
    // "still loading" would hang the landing page forever.
    expect(resolveEntryDestination({ ...base, isAuthenticated: false, workspaceLoading: true, hasWorkspace: false })).toBe("landing");
  });

  /**
   * The regression. Immediately after onboarding the cache is cleared and the
   * lookup re-issued, so for a moment there is no data and no workspace. This
   * previously read as "no workspace" and redirected to onboarding, which
   * remounted at step 1 with every answer gone — while the workspace it was
   * looking for had just been created.
   */
  it("waits, rather than sending the user to onboarding, while the lookup is in flight", () => {
    expect(resolveEntryDestination({ ...base, workspaceLoading: true, hasWorkspace: false })).toBe("loading");
  });

  it("never routes to onboarding while the lookup is unresolved, whatever else is true", () => {
    for (const hasWorkspace of [true, false]) {
      for (const workspaceError of [true, false]) {
        expect(resolveEntryDestination({ ...base, workspaceLoading: true, workspaceError, hasWorkspace })).toBe("loading");
      }
    }
  });

  /**
   * A failed lookup is not evidence of having no workspace. Falling through to
   * onboarding would invite a second, duplicate workspace.
   */
  it("surfaces an error rather than sending the user to onboarding when the lookup fails", () => {
    expect(resolveEntryDestination({ ...base, workspaceError: true, hasWorkspace: false })).toBe("workspace-error");
  });

  it("sends a signed-in user with no workspace to onboarding once the lookup has settled", () => {
    expect(resolveEntryDestination({ ...base, hasWorkspace: false })).toBe("onboarding");
  });

  it("sends a signed-in user with a workspace into the app", () => {
    expect(resolveEntryDestination(base)).toBe("app");
  });
});
