import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Field, EmptyState, LoadingState, Metric, Notice, PrimaryButton, ScreenShell, SectionLabel, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

const types = ["customers", "bookings", "sales", "leads", "launch", "content", "retention"] as const;

export default function GrowthScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const goals = trpc.goals.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const summary = trpc.goals.summary.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const campaigns = trpc.campaigns.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const create = trpc.goals.create.useMutation();
  const createCampaign = trpc.campaigns.create.useMutation();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("customers");
  const [period, setPeriod] = useState("Next 30 days");
  const [target, setTarget] = useState("30");
  const [current, setCurrent] = useState("0");
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("");
  const [campaignPlatform, setCampaignPlatform] = useState<"tiktok" | "instagram" | "facebook" | "email" | "website">("instagram");

  const selectedGoal = goals.data?.[0];
  const progress = selectedGoal ? Math.min(100, Math.round((selectedGoal.actual / Math.max(selectedGoal.target, 1)) * 100)) : 0;
  const planningMath = useMemo(() => selectedGoal ? { remaining: Math.max(0, selectedGoal.target - selectedGoal.actual), ratio: selectedGoal.target ? `${Math.round((selectedGoal.actual / selectedGoal.target) * 100)}%` : "Not available" } : null, [selectedGoal]);

  const saveCampaign = async () => {
    if (!workspaceId || campaignName.trim().length < 2) return;
    await createCampaign.mutateAsync({ workspaceId, name: campaignName.trim(), objective: campaignObjective.trim() || undefined, goalId: selectedGoal?.id, platforms: [campaignPlatform] });
    await utils.campaigns.list.invalidate({ workspaceId });
    setCampaignName(""); setCampaignObjective(""); setShowCampaignForm(false);
  };

  const saveGoal = async () => {
    if (!workspaceId || !title.trim() || Number(target) <= 0) return;
    await create.mutateAsync({ workspaceId, title: title.trim(), goalType: type, period: period.trim() || "Next 30 days", currentPerformance: Math.max(0, Number(current) || 0), target: Number(target) });
    await utils.goals.list.invalidate({ workspaceId });
    await utils.goals.summary.invalidate({ workspaceId });
    setShowForm(false);
    setTitle("");
  };

  if (loading || goals.isLoading || campaigns.isLoading) return <ScreenShell title="Growth" eyebrow="Outcomes"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Growth" eyebrow="Outcomes"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Growth" eyebrow={workspace.name} subtitle="Make the business outcome explicit. Lumière will keep assumptions separate from facts." action={<StatusPill label={`${goals.data?.length || 0} goal${goals.data?.length === 1 ? "" : "s"}`} tone="neutral" />}>
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.ink }}><Text style={{ color: brand.cream, fontSize: 17, fontWeight: "700" }}>Targets are directions, not promises.</Text><Text style={{ color: "#D8C9BA", fontSize: 13, lineHeight: 19 }}>Keep what you want separate from what the business has actually achieved.</Text></Surface>
      <PrimaryButton label="Add a goal" onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="Goal name" value={title} onChangeText={setTitle} placeholder="30 bookings this month" /><Field label="Time period" value={period} onChangeText={setPeriod} placeholder="Next 30 days" /><View style={{ gap: 8 }}><Text style={{ color: brand.ink, fontSize: 14, fontWeight: "700" }}>Outcome</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{types.map((item) => <SecondaryButton key={item} label={item} onPress={() => setType(item)} disabled={type === item} />)}</View></View><View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="Current" keyboardType="number-pad" value={current} onChangeText={setCurrent} placeholder="0" /></View><View style={{ flex: 1 }}><Field label="Target" keyboardType="number-pad" value={target} onChangeText={setTarget} placeholder="30" /></View></View><PrimaryButton label="Save goal" onPress={saveGoal} loading={create.isPending} disabled={!title.trim() || Number(target) <= 0} icon="check" />{create.error ? <Notice tone="error">{create.error.message}</Notice> : null}</View></Surface> : null}
      <SectionLabel>Campaigns</SectionLabel>
      <PrimaryButton label={showCampaignForm ? "Close campaign form" : "Create a campaign"} onPress={() => setShowCampaignForm((value) => !value)} icon={showCampaignForm ? "close" : "add"} />
      {showCampaignForm ? <Surface><View style={{ gap: 14 }}><Field label="Campaign name" value={campaignName} onChangeText={setCampaignName} placeholder="Spring booking campaign" /><Field label="Objective" value={campaignObjective} onChangeText={setCampaignObjective} placeholder="Create demand for the selected goal" multiline /><Text style={{ color: brand.ink, fontSize: 14, fontWeight: "700" }}>Primary platform</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["tiktok", "instagram", "facebook", "email", "website"] as const).map((item) => <SecondaryButton key={item} label={item} onPress={() => setCampaignPlatform(item)} disabled={campaignPlatform === item} />)}</View><Text style={{ color: brand.muted, fontSize: 12 }}>Linked goal: {selectedGoal?.title || "None yet"}. Campaigns start as drafts and do not publish automatically.</Text><PrimaryButton label="Save campaign draft" onPress={saveCampaign} loading={createCampaign.isPending} disabled={campaignName.trim().length < 2} icon="check" />{createCampaign.error ? <Notice tone="error">{createCampaign.error.message}</Notice> : null}</View></Surface> : null}
      {campaigns.error ? <Notice tone="error">{campaigns.error.message}</Notice> : null}
      {campaigns.data?.length ? campaigns.data.map((campaign) => <Surface key={campaign.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>{campaign.name}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>{campaign.objective || "No objective recorded"}</Text></View><StatusPill label={campaign.status} tone="neutral" /></View></Surface>) : <EmptyState title="No campaigns yet" body="Create a draft campaign to connect a goal, content, activity, and Results without inventing performance." />}
      {goals.error ? <Notice tone="error">{goals.error.message}</Notice> : null}
      {selectedGoal ? <><SectionLabel>Current goal</SectionLabel><Surface><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 6 }}><Text style={{ color: brand.ink, fontSize: 18, fontWeight: "700" }}>{selectedGoal.title}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{selectedGoal.period} · {selectedGoal.goalType}</Text></View><StatusPill label={selectedGoal.status} tone="success" /></View><View style={{ height: 10, backgroundColor: brand.sand, borderRadius: 999, overflow: "hidden" }}><View style={{ width: `${progress}%`, height: "100%", backgroundColor: brand.rose, borderRadius: 999 }} /></View><View style={{ flexDirection: "row", gap: 12 }}><Metric value={String(selectedGoal.target)} label="Target" /><Metric value={String(selectedGoal.actual)} label="Actual" /><Metric value={`${progress}%`} label="Progress" detail={selectedGoal.actual ? "Recorded" : "No events yet"} /></View></Surface><SectionLabel>Planning lens</SectionLabel><Surface><View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Target</Text><Text style={{ color: brand.ink, fontSize: 13, fontWeight: "700" }}>{selectedGoal.target}</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Actual</Text><Text style={{ color: brand.ink, fontSize: 13, fontWeight: "700" }}>{selectedGoal.actual}</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Remaining if actuals stay current</Text><Text style={{ color: brand.ink, fontSize: 13, fontWeight: "700" }}>{planningMath?.remaining}</Text></View><Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>Forecast: not available until enough performance data exists. Assumptions: the target is user-entered; no conversion rate or revenue guarantee has been inferred.</Text><PrimaryButton label="Create marketing work" onPress={() => router.push("/content" as any)} icon="auto-awesome" /></View></Surface></> : <EmptyState title="No goals yet" body="Add a measurable outcome so marketing work has a direction. Actuals will appear only when real analytics events are recorded." action={<SecondaryButton label="Create your first goal" onPress={() => setShowForm(true)} />} />}
      <SectionLabel>Actual data signal</SectionLabel><Surface><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>Recorded performance events</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 18 }}>Only connected or manually recorded events appear here.</Text></View><Text style={{ color: brand.ink, fontSize: 24, fontWeight: "700" }}>{summary.data?.actualEventCount ?? 0}</Text></View></Surface>
    </View>
  </ScreenShell>;
}
