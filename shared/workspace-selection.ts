/**
 * Which workspace is "current", given the loaded list and the remembered id.
 *
 * Lives here rather than inside hooks/use-workspace.tsx so it can be tested
 * without pulling in the tRPC client. The bug it exists to prevent lasts a
 * single render frame, which no assertion against the hook's settled output
 * would ever catch — so the rule has to be testable on its own.
 *
 * The rule: any non-empty list yields a workspace. Returning null while rows
 * exist — which is what happens between the render that first sees the data
 * and the effect that picks an active id — is read by "/" as "this account has
 * no workspace", and it redirects to onboarding. A user who had just completed
 * onboarding was thrown back to step 1 with their answers gone, even though
 * the workspace had been created.
 */
export function selectActiveWorkspace<T extends { workspace: { id: number } }>(
  rows: T[],
  activeWorkspaceId: number | null,
): T["workspace"] | null {
  if (!rows.length) return null;
  return (rows.find((row) => row.workspace.id === activeWorkspaceId) || rows[0]).workspace;
}
