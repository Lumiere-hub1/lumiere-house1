import { useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { EmptyState, LoadingState, Notice, ScreenShell, SectionLabel, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

const providerLabels: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", pinterest: "Pinterest", linkedin: "LinkedIn", email: "Email", calendar: "Calendar", booking: "Booking systems", pos: "POS" };

export default function ConnectScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const connectors = trpc.connectors.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const connect = trpc.connectors.connect.useMutation();
  const retry = trpc.connectors.retry.useMutation();
  const [attempted, setAttempted] = useState("");

  if (loading || connectors.isLoading) return <ScreenShell title="Connect" eyebrow="Official access"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Connect" eyebrow="Official access"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  const attempt = async (provider: string, isRetry = false) => {
    setAttempted(provider);
    try {
      const result = isRetry ? await retry.mutateAsync({ workspaceId, provider }) : await connect.mutateAsync({ workspaceId, provider });
      const redirectUrl = (result as { redirectUrl?: string } | undefined)?.redirectUrl;
      if (redirectUrl) {
        if (Platform.OS === "web" && typeof window !== "undefined") window.location.href = redirectUrl;
        else await Linking.openURL(redirectUrl);
      }
    } catch { /* truthful error rendered below */ }
  };

  return <ScreenShell title="Connect" eyebrow={workspace.name} subtitle="Authorize the systems that contain your real business signals. No scraping, no hidden access, no simulated connections.">
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.border }}><Text style={{ color: brand.text, fontSize: 17, fontWeight: "700" }}>Connect → authorize → ready.</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>Some providers require developer approval or credentials that are not present in this environment. Lumière keeps that boundary visible.</Text></Surface>
      {connect.error ? <Notice tone="error">{connect.error.message}</Notice> : null}
      {retry.error ? <Notice tone="error">{retry.error.message}</Notice> : null}
      {connectors.error ? <Notice tone="error">{connectors.error.message}</Notice> : null}
      <SectionLabel>Available providers</SectionLabel>
      {connectors.data?.length ? connectors.data.map((connector) => <Surface key={connector.id}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{providerLabels[connector.provider] || connector.provider}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{connector.status === "connected" ? "Ready for permitted workflows" : connector.status === "approval_required" ? "Approval required" : connector.status === "error" ? "Authorization failed; retry when credentials are corrected" : connector.status === "disconnected" ? "Disconnected; no data will be sent" : "Authorization required"}</Text></View><StatusPill label={connector.status.replace("_", " ")} tone={connector.status === "connected" ? "success" : connector.status === "error" ? "risk" : "warning"} /></View><SecondaryButton label={connector.status === "connected" ? "Manage connection" : connector.status === "error" || connector.status === "disconnected" ? "Retry authorization" : "Connect"} onPress={() => attempt(connector.provider, connector.status === "error" || connector.status === "disconnected")} disabled={(connect.isPending || retry.isPending) && attempted === connector.provider} icon={connector.status === "error" || connector.status === "disconnected" ? "refresh" : "link"} /></Surface>) : <EmptyState title="No connectors configured" body="Workspace connectors will appear here once the workspace has been initialized." />}
    </View>
  </ScreenShell>;
}
