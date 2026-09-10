import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Linking, Platform, Text, View } from "react-native";
import { EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

const providerLabels: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", pinterest: "Pinterest", linkedin: "LinkedIn", email: "Email", calendar: "Calendar", booking: "Booking systems", pos: "POS" };

/**
 * Reasons the OAuth routes send back in ?reason=. Each one is a distinct thing
 * that went wrong and a distinct thing to do about it — the point of listing
 * them is that "TikTok authorization failed" tells the user nothing.
 */
const failureMessages: Record<string, string> = {
  declined: "You cancelled on TikTok, so nothing was connected. You can start again whenever you like.",
  expired: "That authorization link expired. Start the connection again.",
  not_configured: "TikTok is not configured on this server yet, so authorization cannot start.",
  exchange_failed: "TikTok rejected the authorization. Nothing was connected — try again.",
  no_access: "You need to be an owner or admin of this workspace to connect an account.",
  signed_out: "Your session ended while you were on TikTok. Sign in and try again.",
  storage_unavailable: "This server cannot store the connection securely (JWT_SECRET is not set), so nothing was saved.",
  unexpected: "Something went wrong finishing the connection. Nothing was connected.",
};

type ConnectorRow = { id: number; provider: string; status: string; metadata?: unknown; connectedAt?: Date | string | null };

function readMetadata(connector: ConnectorRow) {
  const metadata = connector.metadata && typeof connector.metadata === "object" ? (connector.metadata as Record<string, unknown>) : {};
  return {
    displayName: typeof metadata.displayName === "string" ? metadata.displayName : null,
    avatarUrl: typeof metadata.avatarUrl === "string" ? metadata.avatarUrl : null,
  };
}

export default function ConnectScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  // Set by the OAuth callback when it sends the browser back here.
  const params = useLocalSearchParams<{ tiktok?: string; reason?: string }>();
  const connectors = trpc.connectors.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const connect = trpc.connectors.connect.useMutation();
  const retry = trpc.connectors.retry.useMutation();
  const disconnect = trpc.connectors.disconnect.useMutation();
  const [attempted, setAttempted] = useState("");
  const [disconnectResult, setDisconnectResult] = useState<{ revokedWithProvider: boolean } | null>(null);

  if (loading || connectors.isLoading) return <ScreenShell title="Connect" eyebrow="Official access"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Connect" eyebrow="Official access"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  const openAuthorization = async (redirectUrl: string) => {
    // A full page navigation, not fetch: the OAuth start route needs the
    // session cookie and then 302s the browser out to TikTok.
    if (Platform.OS === "web" && typeof window !== "undefined") window.location.href = redirectUrl;
    else await Linking.openURL(redirectUrl);
  };

  const attempt = async (provider: string, isRetry = false) => {
    setAttempted(provider);
    setDisconnectResult(null);
    try {
      const result = isRetry ? await retry.mutateAsync({ workspaceId, provider }) : await connect.mutateAsync({ workspaceId, provider });
      const redirectUrl = (result as { redirectUrl?: string } | undefined)?.redirectUrl;
      if (redirectUrl) await openAuthorization(redirectUrl);
    } catch { /* truthful error rendered below */ }
  };

  const drop = async (provider: string) => {
    setAttempted(provider);
    try {
      const result = await disconnect.mutateAsync({ workspaceId, provider });
      setDisconnectResult({ revokedWithProvider: result.revokedWithProvider });
      await connectors.refetch();
    } catch { /* truthful error rendered below */ }
  };

  const tiktok = connectors.data?.find((connector) => connector.provider === "tiktok") as ConnectorRow | undefined;
  const others = (connectors.data ?? []).filter((connector) => connector.provider !== "tiktok");
  const busy = (connect.isPending || retry.isPending || disconnect.isPending) && attempted === "tiktok";
  const tiktokConnected = tiktok?.status === "connected";
  const { displayName: tiktokName, avatarUrl: tiktokAvatar } = tiktok ? readMetadata(tiktok) : { displayName: null, avatarUrl: null };
  const tiktokSummary = tiktokConnected
    ? tiktokName
      ? `Connected as ${tiktokName}.`
      : "Connected. TikTok did not return a display name for this account."
    : tiktok?.status === "disconnected"
      ? "Disconnected. No data is being read from TikTok."
      : "Not connected. You will be sent to TikTok to authorize, then returned here.";

  return <ScreenShell title="Connect" eyebrow={workspace.name} subtitle="Authorize the systems that contain your real business signals. No scraping, no hidden access, no simulated connections.">
    <View style={{ gap: 16 }}>
      {params.tiktok === "connected" ? <Notice tone="success">TikTok is connected.</Notice> : null}
      {params.tiktok === "error" ? <Notice tone="error">{failureMessages[params.reason ?? ""] ?? "TikTok authorization did not complete. Nothing was connected."}</Notice> : null}
      {disconnectResult ? <Notice tone="success">{disconnectResult.revokedWithProvider ? "Disconnected. The access token was deleted here and revoked with TikTok." : "Disconnected. The access token was deleted here; TikTok did not confirm revocation, so it will lapse on its own when it expires."}</Notice> : null}
      {connect.error ? <Notice tone="error">{connect.error.message}</Notice> : null}
      {retry.error ? <Notice tone="error">{retry.error.message}</Notice> : null}
      {disconnect.error ? <Notice tone="error">{disconnect.error.message}</Notice> : null}
      {connectors.error ? <Notice tone="error">{connectors.error.message}</Notice> : null}

      {tiktok ? <>
        <SectionLabel>TikTok</SectionLabel>
        <Surface>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                {tiktokConnected && tiktokAvatar ? <Image source={{ uri: tiktokAvatar }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: brand.border }} /> : null}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>TikTok</Text>
                  <Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>{tiktokSummary}</Text>
                </View>
              </View>
              <StatusPill label={tiktok.status.replace("_", " ")} tone={tiktok.status === "connected" ? "success" : tiktok.status === "error" ? "risk" : "warning"} />
            </View>

            {tiktokConnected
              ? <SecondaryButton label="Disconnect TikTok" onPress={() => drop("tiktok")} disabled={busy} icon="link-off" />
              : <PrimaryButton label="Connect TikTok" onPress={() => attempt("tiktok", tiktok.status === "error" || tiktok.status === "disconnected")} loading={busy} icon="link" />}

            <Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>
              Lumière asks TikTok only for your basic profile. Disconnecting deletes the access token stored here and asks TikTok to revoke it.
            </Text>
          </View>
        </Surface>
      </> : null}

      <SectionLabel>Other providers</SectionLabel>
      {others.length ? others.map((connector) => <Surface key={connector.id}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{providerLabels[connector.provider] || connector.provider}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{connector.status === "connected" ? "Ready for permitted workflows" : connector.status === "approval_required" ? "Approval required" : connector.status === "error" ? "Authorization failed; retry when credentials are corrected" : connector.status === "disconnected" ? "Disconnected; no data will be sent" : "Authorization required"}</Text></View><StatusPill label={connector.status.replace("_", " ")} tone={connector.status === "connected" ? "success" : connector.status === "error" ? "risk" : "warning"} /></View><SecondaryButton label={connector.status === "error" || connector.status === "disconnected" ? "Retry authorization" : "Connect"} onPress={() => attempt(connector.provider, connector.status === "error" || connector.status === "disconnected")} disabled={(connect.isPending || retry.isPending) && attempted === connector.provider} icon={connector.status === "error" || connector.status === "disconnected" ? "refresh" : "link"} /></Surface>) : <EmptyState title="No other connectors configured" body="Workspace connectors will appear here once the workspace has been initialized." />}
    </View>
  </ScreenShell>;
}
