import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { EmptyState, Field, LoadingState, Notice, PrimaryButton, ScreenShell, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { workspace, workspaceId, workspaces, loading, switchWorkspace, refresh } = useWorkspace();
  const subscription = trpc.billing.subscription.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const create = trpc.workspaces.create.useMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  if (loading) return <ScreenShell title="Settings" eyebrow="Account"><LoadingState /></ScreenShell>;
  const signOut = async () => { await logout(); router.replace("/login" as any); };
  const createNew = async () => {
    if (name.trim().length < 2) return;
    const created = await create.mutateAsync({ name: name.trim(), industry: industry.trim() || undefined });
    await refresh(); await switchWorkspace(created.id); setName(""); setIndustry(""); setShowCreate(false); router.replace("/" as any);
  };

  return <ScreenShell title="Settings" eyebrow={workspace?.name || "Lumière House"} subtitle={user?.email || "Account settings"}>
    <View style={{ gap: 16 }}>
      {create.error ? <Notice tone="error">{create.error.message}</Notice> : null}
      <Surface><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>Current workspace</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{workspace?.name || "No workspace"}</Text></View><StatusPill label={workspace ? "Active" : "Setup needed"} tone={workspace ? "success" : "warning"} /></View></Surface>
      <Surface><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>Switch workspace</Text>{workspaces.length ? <View style={{ gap: 8, paddingTop: 4 }}>{workspaces.map((row) => <SecondaryButton key={row.workspace.id} label={`${row.workspace.name} · ${row.role}`} onPress={() => switchWorkspace(row.workspace.id)} disabled={row.workspace.id === workspaceId} icon={row.workspace.id === workspaceId ? "check" : "business"} />)}</View> : <EmptyState title="No workspaces" body="Create a workspace to begin." />}<View style={{ paddingTop: 4 }}><SecondaryButton label={showCreate ? "Close create form" : "Create another workspace"} onPress={() => setShowCreate((value) => !value)} icon={showCreate ? "close" : "add-business"} /></View>{showCreate ? <View style={{ gap: 12, paddingTop: 8 }}><Field label="Workspace name" value={name} onChangeText={setName} placeholder="A second business" /><Field label="Industry" value={industry} onChangeText={setIndustry} placeholder="Optional" /><PrimaryButton label="Create workspace" onPress={createNew} loading={create.isPending} disabled={name.trim().length < 2} icon="check" /></View> : null}</Surface>
      <Surface><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>Plan</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{subscription.data?.plan || "Not available"} · {subscription.data?.status || "No billing record"}</Text></View><StatusPill label={subscription.data?.status || "Unknown"} tone={subscription.data?.status === "active" ? "success" : "warning"} /></View><Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18, paddingTop: 8 }}>Payments are not simulated. A billing provider can be connected when credentials and business approval are available.</Text></Surface>
      <View style={{ gap: 10 }}><SecondaryButton label="Open Growth" onPress={() => router.push("/growth" as any)} icon="trending-up" /><SecondaryButton label="Open Results" onPress={() => router.push("/results" as any)} icon="insights" /><SecondaryButton label="Open Automate" onPress={() => router.push("/automate" as any)} icon="tune" /><SecondaryButton label="Open Connect" onPress={() => router.push("/connect" as any)} icon="link" /><SecondaryButton label="Import performance evidence" onPress={() => router.push("/performance" as any)} icon="upload-file" /><SecondaryButton label="Manage schedules" onPress={() => router.push("/schedules" as any)} icon="schedule" /><SecondaryButton label="Read help and policy notes" onPress={() => router.push("/help" as any)} icon="help-outline" /><SecondaryButton label="Sign out" onPress={signOut} icon="logout" /></View>
    </View>
  </ScreenShell>;
}
