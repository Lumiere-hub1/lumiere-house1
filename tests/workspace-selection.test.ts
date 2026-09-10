import { describe, expect, it } from "vitest";
import { selectActiveWorkspace } from "../shared/workspace-selection";

const row = (id: number, name: string) => ({ workspace: { id, name, slug: name.toLowerCase(), timezone: "UTC", onboardingStep: 6 }, role: "owner" as const });

describe("selectActiveWorkspace", () => {
  it("returns null only when there are genuinely no workspaces", () => {
    expect(selectActiveWorkspace([], null)).toBeNull();
    expect(selectActiveWorkspace([], 7)).toBeNull();
  });

  it("returns the remembered workspace when it is still in the list", () => {
    const rows = [row(1, "First"), row(2, "Second")];
    expect(selectActiveWorkspace(rows, 2)?.name).toBe("Second");
  });

  /**
   * The regression this file exists for. Immediately after onboarding the list
   * arrives with one row while the remembered id is still null, because the
   * effect that sets it has not run yet. Returning null in that frame told "/"
   * the account had no workspace, and it redirected to onboarding — which
   * remounted at step 1 with every answer gone, despite the workspace having
   * been created a moment earlier.
   */
  it("falls back to the first workspace when no id is remembered yet", () => {
    const rows = [row(41, "Just Created")];
    expect(selectActiveWorkspace(rows, null)).not.toBeNull();
    expect(selectActiveWorkspace(rows, 41)?.name).toBe("Just Created");
  });

  it("falls back when the remembered workspace is gone, rather than reporting none", () => {
    // Left the workspace, or it was deleted on another device.
    const rows = [row(9, "Remaining")];
    expect(selectActiveWorkspace(rows, 404)?.id).toBe(9);
  });

  it("never reports null while any workspace is present", () => {
    const rows = [row(3, "A"), row(4, "B")];
    for (const id of [null, 0, -1, 3, 4, 999]) {
      expect(selectActiveWorkspace(rows, id as number | null)).not.toBeNull();
    }
  });
});
