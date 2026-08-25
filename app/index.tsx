import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { LoadingState } from "@/components/lumiere-ui";
import { ScreenContainer } from "@/components/screen-container";

export default function EntryScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { workspace, loading: workspaceLoading } = useWorkspace();

  if (authLoading || (isAuthenticated && workspaceLoading)) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><LoadingState label="Preparing your Lumière House…" /></ScreenContainer>;
  }
  if (!isAuthenticated) return <Redirect href={"/login" as any} />;
  if (!workspace) return <Redirect href={"/onboarding" as any} />;
  return <Redirect href="/(tabs)" />;
}
