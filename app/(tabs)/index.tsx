import { router } from "expo-router";
import { Text, View } from "react-native";
import { useMemo } from "react";
import { IconButton, LoadingState, Metric, Notice, RecommendationCard, ScreenShell, SectionLabel, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

export default function TodayScreen() {
  const { workspace, workspaceId, loading: workspaceLoading, error: workspaceError } = useWorkspace();
  const dashboardQuery = trpc.workspaces.dashboard.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId), staleTime: 10_000 });
  const dashboard = dashboardQuery.data;
  const recommendations = useMemo(() => {
    if (!dashboard) return [];
    const items: { title: string; why: string; action: string; impact: string; confidence: string; approval: string; tone?: "default" | "risk"; route: "/growth" | "/content" | "/approvals" | "/clients"   }[] = [];
    if (dashboard.approvals.length) items.push({ title: `${dashboard.approvals.length} item${dashboard.approvals.length === 1 ? "" : "s"} awaiting approval`, why: "A reviewed action is waiting for a human decision.", action: "Open the approval inbox and decide what happens next.", impact: "Protects quality", confidence: "High", approval: "Required", route: "/approvals" });
    const needsFollowUp = dashboard.clients.filter((client) => client.consentStatus === "granted" && !client.lastContactedAt).length;
    if (needsFollowUp) items.push({ title: `${needsFollowUp} consented client${needsFollowUp === 1 ? "" : "s"} need a first follow-up`, why: "These client records have consent but no recorded outreach.", action: "Review Client Care and create a message draft.", impact: "Retention opportunity", confidence: "Medium", approval: "Review", route: "/clients" });
    const atRiskClients = dashboard.clients.filter((client) => client.consentStatus === "granted" && client.lastVisitAt && !client.lastContactedAt && Date.now() - new Date(client.lastVisitAt).getTime() > 30 * 24 * 60 * 60 * 1000).length;
    if (atRiskClients) items.push({ title: `${atRiskClients} consented client${atRiskClients === 1 ? "" : "s"} may be drifting`, why: "A real visit is recorded, but there is no recent outreach signal.", action: "Review Client Care before suggesting any contact.", impact: "At-risk relationship", confidence: "Medium", approval: "Required", route: "/clients" });
    if (dashboard.content.filter((item) => item.status === "needs_improvement").length) items.push({ title: "Improve a draft before it moves forward", why: "The quality engine found a draft below the approval threshold.", action: "Open Content Studio and run an improvement pass.", impact: "Raises conversion readiness", confidence: "High", approval: "Required", route: "/content" });
    if (dashboard.goals.length === 0) items.push({ title: "Set the first business goal", why: "Lumière needs a measurable outcome before it can recommend marketing work.", action: "Add a goal with a period and target.", impact: "Creates direction", confidence: "High", approval: "Not needed", route: "/growth" });
    if (dashboard.content.length === 0) items.push({ title: "Create the first piece of marketing work", why: "Your workspace has no content drafts yet.", action: "Describe the outcome you want and let Lumière shape the draft.", impact: "Starts the loop", confidence: "Medium", approval: "Review", route: "/content" });
    return items.slice(0, 3);
  }, [dashboard]);

  if (workspaceLoading || dashboardQuery.isLoading) return <ScreenShell title="Today" eyebrow="Command center"><LoadingState /></ScreenShell>;
  if (workspaceError || dashboardQuery.error) return <ScreenShell title="Today" eyebrow="Command center"><Notice tone="error">{workspaceError?.message || dashboardQuery.error?.message || "We could not load this workspace."}</Notice></ScreenShell>;
  if (!workspaceId || !workspace || !dashboard) return <ScreenShell title="Today" eyebrow="Command center"><Notice tone="error">No active workspace is available. Complete setup before using Today.</Notice></ScreenShell>;

  const pendingCount = dashboard.approvals.length;
  const activeGoals = dashboard.goals.filter((goal) => goal.status === "active").length;
  const connected = dashboard.connectors.filter((connector) => connector.status === "connected").length;
  const consentedWithoutContact = dashboard.clients.filter((client) => client.consentStatus === "granted" && !client.lastContactedAt).length;
  const needsImprovement = dashboard.content.filter((item) => item.status === "needs_improvement").length;
  const todayPlan = [
    pendingCount ? `Holding ${pendingCount} action${pendingCount === 1 ? "" : "s"} for your approval.` : null,
    consentedWithoutContact ? `Surfacing ${consentedWithoutContact} consented relationship${consentedWithoutContact === 1 ? "" : "s"} for review.` : null,
    needsImprovement ? `Flagging ${needsImprovement} draft${needsImprovement === 1 ? "" : "s"} for another quality pass.` : null,
    !activeGoals ? "Waiting for a measurable business goal before prioritizing growth work." : null,
    !dashboard.analytics.length ? "Listening for actual performance evidence; no forecast is being inferred." : null,
  ].filter((item): item is string => Boolean(item));

  return <ScreenShell title="Today" eyebrow={workspace.name} subtitle="The few actions that deserve your attention now." action={<IconButton icon="settings" label="Open settings" onPress={() => router.push("/settings" as any)} />}>
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.ink }}><Text style={{ color: brand.cream, fontSize: 17, fontWeight: "700", lineHeight: 23 }}>Good work is focused work.</Text><Text style={{ color: "#D8C9BA", fontSize: 13, lineHeight: 19 }}>Lumière uses what is actually in your workspace to decide what deserves a next step.</Text></Surface>
      <View style={{ flexDirection: "row", gap: 12 }}><Metric value={String(activeGoals)} label="Active goals" /><Metric value={String(dashboard.content.length)} label="Drafts" /><Metric value={String(pendingCount)} label="Needs review" detail={pendingCount ? "Open now" : "Clear"} /></View>
      <SectionLabel action={<StatusPill label={`${connected} connected`} tone={connected ? "success" : "warning"} />}>What matters now</SectionLabel>
      {recommendations.length ? recommendations.map((item) => <RecommendationCard key={item.title} {...item} onPress={() => router.push(item.route as any)} />) : <Surface><Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>Nothing needs urgent attention.</Text><Text style={{ color: brand.muted, fontSize: 14, lineHeight: 20 }}>Once your workspace has goals, clients, or content, Lumière will surface the next best action here.</Text></Surface>}
      <SectionLabel>What Lumière is doing today</SectionLabel>
      <Surface><View style={{ gap: 9 }}>{todayPlan.length ? todayPlan.map((item) => <View key={item} style={{ flexDirection: "row", gap: 9, alignItems: "flex-start" }}><View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: brand.rose, marginTop: 6 }} /><Text style={{ flex: 1, color: brand.ink, fontSize: 13, lineHeight: 19 }}>{item}</Text></View>) : <Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>No active work is inferred from this workspace yet. Add a goal, client record, or content brief to begin.</Text>}</View></Surface>
      <SectionLabel>Loop status</SectionLabel>
      <Surface><View style={{ gap: 10 }}>{["Business understanding", "Strategy and offer", "Content and quality", "Approval and publishing", "Measurement and learning"].map((label, index) => { const active = index === 0 ? Boolean(dashboard.business) : index === 1 ? Boolean(dashboard.goals.length) : index === 2 ? Boolean(dashboard.content.length) : index === 3 ? Boolean(dashboard.approvals.length || dashboard.content.some((item) => item.status === "approved" || item.status === "published")) : Boolean(dashboard.analytics.length); return <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: active ? brand.green : brand.border }} /><Text style={{ color: active ? brand.ink : brand.muted, fontSize: 13, fontWeight: active ? "700" : "500" }}>{label}</Text><Text style={{ marginLeft: "auto", color: active ? brand.green : brand.muted, fontSize: 12 }}>{active ? "In motion" : "Waiting"}</Text></View>; })}</View></Surface>
      <Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>Forecasts are directional, not guarantees. Actuals appear only after real performance data is recorded.</Text>
    </View>
  </ScreenShell>;
}
