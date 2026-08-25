import { useState } from "react";
import { Text, View } from "react-native";
import { Field, EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

export default function AutomateScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const automations = trpc.automations.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const create = trpc.automations.create.useMutation();
  const toggle = trpc.automations.toggle.useMutation();
  const run = trpc.automations.run.useMutation();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("overdue_rebooking");

  const save = async () => {
    if (!workspaceId || name.trim().length < 2) return;
    await create.mutateAsync({ workspaceId, name: name.trim(), triggerType, requiresApproval: true, quietHours: { start: "21:00", end: "08:00" }, actionLimits: { maxPerDay: 10 } });
    await utils.automations.list.invalidate({ workspaceId });
    setName(""); setShowForm(false);
  };
  const changeEnabled = async (automationId: number, enabled: boolean) => {
    if (!workspaceId) return;
    await toggle.mutateAsync({ workspaceId, automationId, enabled });
    await utils.automations.list.invalidate({ workspaceId });
  };
  const requestRun = async (automationId: number) => {
    if (!workspaceId) return;
    await run.mutateAsync({ workspaceId, automationId });
  };

  if (loading || automations.isLoading) return <ScreenShell title="Automate" eyebrow="Guardrails"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Automate" eyebrow="Guardrails"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Automate" eyebrow={workspace.name} subtitle="Let Lumière prepare work, never take uncontrolled action.">
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.ink }}><Text style={{ color: brand.cream, fontSize: 17, fontWeight: "700" }}>Human control is part of the engine.</Text><Text style={{ color: "#D8C9BA", fontSize: 13, lineHeight: 19 }}>Every recipe carries approval requirements, quiet hours, action limits, and a visible pause state.</Text></Surface>
      <PrimaryButton label={showForm ? "Close recipe form" : "Create a recipe"} onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="Recipe name" value={name} onChangeText={setName} placeholder="Recover overdue rebookings" /><Field label="Trigger" value={triggerType} onChangeText={setTriggerType} placeholder="overdue_rebooking" /><Notice>New recipes start disabled and require approval. Default quiet hours are 21:00–08:00 with a limit of 10 actions per day.</Notice><PrimaryButton label="Save recipe" onPress={save} loading={create.isPending} disabled={name.trim().length < 2} icon="save" />{create.error ? <Notice tone="error">{create.error.message}</Notice> : null}</View></Surface> : null}
      {automations.error ? <Notice tone="error">{automations.error.message}</Notice> : null}
      <SectionLabel>Recipes</SectionLabel>
      {automations.data?.length ? automations.data.map((automation) => <Surface key={automation.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>{automation.name}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{automation.triggerType} · {automation.requiresApproval ? "Approval required" : "Low-risk"}</Text></View><StatusPill label={automation.enabled ? "Enabled" : "Paused"} tone={automation.enabled ? "success" : "warning"} /></View><Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>Quiet hours and action limits are enforced before any run. Publishing or outreach still requires an authorized connector.</Text><View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><SecondaryButton label={automation.enabled ? "Pause" : "Enable"} onPress={() => changeEnabled(automation.id, !automation.enabled)} icon={automation.enabled ? "pause" : "play-arrow"} /></View><View style={{ flex: 1 }}><SecondaryButton label="Run check" onPress={() => requestRun(automation.id)} icon="play-circle-outline" /></View></View>{run.isSuccess ? <Notice>Run recorded as blocked when no outbound connector is authorized. No message or post was sent.</Notice> : null}{run.error ? <Notice tone="error">{run.error.message}</Notice> : null}</Surface>) : <EmptyState title="No recipes yet" body="Start with a bounded workflow such as overdue rebooking or review requests. Lumière will not run it silently." />}
    </View>
  </ScreenShell>;
}
