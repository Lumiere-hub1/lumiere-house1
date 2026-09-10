import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { selectActiveWorkspace } from "@/shared/workspace-selection";

const ACTIVE_WORKSPACE_KEY = "lumiere.activeWorkspaceId";

type WorkspaceRow = { workspace: { id: number; name: string; slug: string; timezone: string; onboardingStep: number }; role: "owner" | "admin" | "member" | "viewer" };

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useWorkspace() {
  const { isAuthenticated } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const workspacesQuery = trpc.workspaces.list.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY).then((value) => {
      if (value) setActiveWorkspaceId(Number(value));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const rows = workspacesQuery.data || [];
    if (!rows.length) {
      setActiveWorkspaceId(null);
      return;
    }
    const stillAvailable = activeWorkspaceId && rows.some((row) => row.workspace.id === activeWorkspaceId);
    if (!stillAvailable) {
      const first = rows[0]?.workspace.id ?? null;
      setActiveWorkspaceId(first);
      if (first) AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, String(first)).catch(() => undefined);
    }
  }, [workspacesQuery.data, activeWorkspaceId]);

  const switchWorkspace = useCallback(async (workspaceId: number) => {
    setActiveWorkspaceId(workspaceId);
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, String(workspaceId));
  }, []);

  const workspace = useMemo(
    () => selectActiveWorkspace(workspacesQuery.data || [], activeWorkspaceId),
    [workspacesQuery.data, activeWorkspaceId],
  );

  return {
    workspace,
    workspaceId: activeWorkspaceId,
    workspaces: (workspacesQuery.data || []) as WorkspaceRow[],
    // isPending, not isLoading. isLoading is `isPending && isFetching`, and on
    // the render where `enabled` flips true the fetch has been scheduled but
    // not started — so isFetching is false and isLoading reports false while
    // there is still no data. "/" reads that as a settled "no workspace" and
    // redirects to onboarding before the request it is waiting on has even
    // left the browser. isPending stays true until the query actually resolves.
    //
    // A disabled query is pending forever, which is correct here only because
    // every consumer gates on isAuthenticated first (see app/index.tsx); do not
    // consume this without that guard.
    loading: workspacesQuery.isPending,
    error: workspacesQuery.error,
    refresh: workspacesQuery.refetch,
    switchWorkspace,
  };
}
