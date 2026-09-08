import { useState } from "react";
import { Text, View } from "react-native";
import { EmptyState, Field, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { useWorkspace } from "@/hooks/use-workspace";
import { trpc } from "@/lib/trpc";

const nextHour = () => { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(0, 0, 0); return date.toISOString().slice(0, 16); };

export default function SchedulesScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const schedules = trpc.schedules.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const create = trpc.schedules.create.useMutation();
  const toggle = trpc.schedules.toggle.useMutation();
  const runCheck = trpc.schedules.runCheck.useMutation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("Review tomorrow's performance import");
  const [runAt, setRunAt] = useState(nextHour());
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = () => utils.schedules.list.invalidate({ workspaceId: workspaceId || 0 });
  const save = async () => {
    if (!workspaceId || name.trim().length < 2) return;
    await create.mutateAsync({ workspaceId, name: name.trim(), scheduleType: "performance_import", runAt: new Date(runAt).toISOString(), requiresApproval: true });
    await refresh(); setShowForm(false); setNotice("Schedule saved paused. Enable it only after reviewing the guardrails.");
  };
  const changeEnabled = async (scheduleId: number, enabled: boolean) => { await toggle.mutateAsync({ workspaceId: workspaceId!, scheduleId, enabled }); await refresh(); };
  const check = async (scheduleId: number) => { const result = await runCheck.mutateAsync({ workspaceId: workspaceId!, scheduleId }); setNotice(result?.reason || "Schedule check recorded."); await refresh(); };

  if (loading || schedules.isLoading) return <ScreenShell title="Schedules" eyebrow="Control"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Schedules" eyebrow="Control"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Schedules" eyebrow={workspace.name} subtitle="Prepare recurring work without surrendering control.">
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.border }}><Text style={{ color: brand.text, fontSize: 17, fontWeight: "700" }}>Bounded by design.</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>Schedules begin paused. Approval, quiet hours, action limits, and an authorized connector are checked before execution.</Text></Surface>
      <PrimaryButton label={showForm ? "Close schedule form" : "Create a schedule"} onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="Schedule name" value={name} onChangeText={setName} placeholder="Review weekly performance" /><Field label="Run at" hint="Use a future local date/time; the server stores an ISO timestamp." value={runAt} onChangeText={setRunAt} placeholder="2026-08-27T10:00" /><PrimaryButton label="Save paused schedule" onPress={save} loading={create.isPending} disabled={name.trim().length < 2 || !runAt} icon="check" />{create.error ? <Notice tone="error">{create.error.message}</Notice> : null}</View></Surface> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <SectionLabel>Schedule history</SectionLabel>
      {schedules.data?.length ? schedules.data.map((schedule) => <Surface key={schedule.id}><View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{schedule.name}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>{schedule.scheduleType} · {new Date(schedule.runAt).toLocaleString()}</Text></View><StatusPill label={schedule.enabled ? "scheduled" : "paused"} tone={schedule.enabled ? "warning" : "neutral"} /></View><Text style={{ color: brand.muted, fontSize: 12 }}>{schedule.guardrailNote}</Text><View style={{ flexDirection: "row", gap: 10 }}><PrimaryButton label={schedule.enabled ? "Pause" : "Enable"} onPress={() => changeEnabled(schedule.id, !schedule.enabled)} loading={toggle.isPending} icon={schedule.enabled ? "pause" : "play-arrow"} /><PrimaryButton label="Run check" onPress={() => check(schedule.id)} loading={runCheck.isPending} icon="rule" /></View></View></Surface>) : <EmptyState title="No schedules yet" body="Create a paused performance import or automation check schedule when you know the next real business action." />}
    </View>
  </ScreenShell>;
}
