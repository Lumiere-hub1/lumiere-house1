import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { LoadingState, Notice, SecondaryButton } from "@/components/lumiere-ui";
import { ScreenContainer } from "@/components/screen-container";
import LandingPage from "@/components/landing-page";
import { resolveEntryDestination } from "@/shared/entry-destination";

export default function EntryScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { workspace, loading: workspaceLoading, error: workspaceError, refresh } = useWorkspace();

  const destination = resolveEntryDestination({
    authLoading,
    isAuthenticated,
    workspaceLoading,
    workspaceError: Boolean(workspaceError),
    hasWorkspace: Boolean(workspace),
  });

  switch (destination) {
    case "loading":
      return <ScreenContainer edges={["top", "bottom", "left", "right"]}><LoadingState label="Preparing your Lumière House…" /></ScreenContainer>;
    // Unauthenticated visitors see the public landing page instead of being
    // sent straight to login — they should be able to look around first.
    case "landing":
      return <LandingPage />;
    case "workspace-error":
      return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={{ flex: 1, justifyContent: "center", gap: 16, paddingHorizontal: 16 }}>
          <Notice tone="error">We could not load your workspace. Nothing has been changed.</Notice>
          <SecondaryButton label="Try again" onPress={() => { void refresh(); }} icon="refresh" />
        </View>
      </ScreenContainer>;
    case "onboarding":
      return <Redirect href={"/onboarding" as any} />;
    case "app":
      return <Redirect href="/(tabs)" />;
  }
}
