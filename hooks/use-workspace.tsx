import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

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

  const workspace = useMemo(() => {
    return (workspacesQuery.data || []).find((row) => row.workspace.id === activeWorkspaceId)?.workspace || null;
  }, [workspacesQuery.data, activeWorkspaceId]);

  return {
    workspace,
    workspaceId: activeWorkspaceId,
    workspaces: (workspacesQuery.data || []) as WorkspaceRow[],
    loading: workspacesQuery.isLoading,
    error: workspacesQuery.error,
    refresh: workspacesQuery.refetch,
    switchWorkspace,
  };
}
