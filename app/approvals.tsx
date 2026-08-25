import { router } from "expo-router";
import { Text, View } from "react-native";
import { EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

export default function ApprovalsScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const approvals = trpc.approvals.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const decide = trpc.approvals.decide.useMutation();
  const utils = trpc.useUtils();

  const handle = async (approvalId: number, status: "approved" | "edited" | "rejected" | "scheduled" | "paused") => {
    if (!workspaceId) return;
    await decide.mutateAsync({ workspaceId, approvalId, status });
    await utils.approvals.list.invalidate({ workspaceId });
  };

  if (loading || approvals.isLoading) return <ScreenShell title="Approval inbox" eyebrow="Human control"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Approval inbox" eyebrow="Human control"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Approval inbox" eyebrow={workspace.name} subtitle="Every sensitive action stays here until a person decides what happens next.">
    <View style={{ gap: 14 }}>
      <Surface tone="ink" style={{ borderColor: brand.ink }}><Text style={{ color: brand.cream, fontSize: 17, fontWeight: "700" }}>Automation stops at approval.</Text><Text style={{ color: "#D8C9BA", fontSize: 13, lineHeight: 19 }}>Approving a draft changes its workflow state. It does not publish anything unless an authorized connector and schedule are present.</Text></Surface>
      {approvals.error ? <Notice tone="error">{approvals.error.message}</Notice> : null}
      {decide.error ? <Notice tone="error">{decide.error.message}</Notice> : null}
      {approvals.data?.length ? approvals.data.map((approval) => <Surface key={approval.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>{approval.what}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{approval.actionType} · {approval.whereTo || "Workspace"}</Text></View><StatusPill label={approval.status} tone={approval.status === "approved" ? "success" : approval.status === "rejected" ? "risk" : "warning"} /></View><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 20 }}><Text style={{ fontWeight: "700" }}>Why: </Text>{approval.why || "No reason recorded."}</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}><Text style={{ fontWeight: "700" }}>Purpose: </Text>{approval.expectedPurpose || "Not provided."}</Text><Text style={{ color: approval.risk === "high" ? brand.ember : brand.muted, fontSize: 12, lineHeight: 18 }}>Risk: {approval.risk} · Approval required: yes</Text>{approval.status === "pending" ? <View style={{ gap: 8, paddingTop: 3 }}><PrimaryButton label="Approve" onPress={() => handle(approval.id, "approved")} loading={decide.isPending} icon="check" /><View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><SecondaryButton label="Edit" onPress={() => approval.contentItemId ? router.push({ pathname: "/content/detail" as any, params: { id: String(approval.contentItemId) } }) : undefined} icon="edit" /></View><View style={{ flex: 1 }}><SecondaryButton label="Reject" onPress={() => handle(approval.id, "rejected")} icon="close" /></View></View><View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><SecondaryButton label="Schedule" onPress={() => handle(approval.id, "scheduled")} icon="event" /></View><View style={{ flex: 1 }}><SecondaryButton label="Pause" onPress={() => handle(approval.id, "paused")} icon="pause" /></View></View></View> : null}</Surface>) : <EmptyState title="Inbox is clear" body="No approval requests are waiting in this workspace. New content and sensitive outreach will appear here when they need a human decision." />}
    </View>
  </ScreenShell>;
}
