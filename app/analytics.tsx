import { useState } from "react";
import { Text, View } from "react-native";
import { Field, EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";
import { buildResultsLens } from "@/shared/results";

export default function AnalyticsScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const events = trpc.analytics.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const learning = trpc.analytics.learning.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const record = trpc.analytics.record.useMutation();
  const utils = trpc.useUtils();
  const [eventType, setEventType] = useState("booking");
  const [value, setValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const goal = trpc.goals.summary.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const breakdown = trpc.analytics.breakdown.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const comparison = trpc.analytics.comparison.useQuery({ workspaceId: workspaceId || 0, periodDays: 30 }, { enabled: Boolean(workspaceId) });

  const save = async () => {
    if (!workspaceId || eventType.trim().length < 2) return;
    await record.mutateAsync({ workspaceId, eventType: eventType.trim(), value: value ? Number(value) : undefined });
    await utils.analytics.list.invalidate({ workspaceId });
    setEventType("booking"); setValue(""); setShowForm(false);
  };

  if (loading || events.isLoading || goal.isLoading || breakdown.isLoading || comparison.isLoading) return <ScreenShell title="Results" eyebrow="Measure what happened"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Results" eyebrow="Measure what happened"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  const currentGoal = goal.data?.goals?.[0];
  const resultsLens = buildResultsLens({ target: currentGoal?.target, actual: currentGoal?.actual ?? 0, goalType: currentGoal?.goalType, hasComparableEvidence: Boolean(events.data?.length && learning.data?.length) });

  return <ScreenShell title="Results" eyebrow={workspace.name} subtitle="Actual events first. Learning comes after evidence.">
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.border }}><Text style={{ color: brand.text, fontSize: 17, fontWeight: "700" }}>No invented lift.</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>Lumière only shows performance that arrived from a connected system or was explicitly recorded by your team.</Text></Surface>
      <SectionLabel>Results lens</SectionLabel>
      <Surface><View style={{ gap: 12 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Target</Text><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{resultsLens.targetLabel}</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Forecast</Text><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{resultsLens.forecastLabel}</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Actual results</Text><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{resultsLens.actualLabel}</Text></View>{resultsLens.progress !== null ? <View style={{ gap: 6 }}><View style={{ height: 8, backgroundColor: brand.sand, borderRadius: 999, overflow: "hidden" }}><View style={{ width: `${resultsLens.progress}%`, height: "100%", backgroundColor: brand.green, borderRadius: 999 }} /></View><Text style={{ color: brand.muted, fontSize: 12 }}>{resultsLens.progress}% of target recorded</Text></View> : null}<Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>{resultsLens.assumptions}</Text></View></Surface>
      <View style={{ flexDirection: "row", gap: 12 }}><View style={{ flex: 1 }}><Surface><Text style={{ color: brand.muted, fontSize: 12 }}>Events recorded</Text><Text style={{ color: brand.text, fontSize: 28, fontWeight: "700", paddingTop: 5 }}>{events.data?.length || 0}</Text></Surface></View><View style={{ flex: 1 }}><Surface><Text style={{ color: brand.muted, fontSize: 12 }}>Insights</Text><Text style={{ color: brand.text, fontSize: 28, fontWeight: "700", paddingTop: 5 }}>{learning.data?.length || 0}</Text></Surface></View></View>
      <PrimaryButton label={showForm ? "Close event form" : "Record an actual event"} onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="Event type" value={eventType} onChangeText={setEventType} placeholder="booking, sale, lead…" /><Field label="Value" hint="Optional integer value. Leave blank when there is no numeric value." keyboardType="number-pad" value={value} onChangeText={setValue} placeholder="Optional" /><PrimaryButton label="Record event" onPress={save} loading={record.isPending} disabled={eventType.trim().length < 2} icon="check" />{record.error ? <Notice tone="error">{record.error.message}</Notice> : null}</View></Surface> : null}
      {events.error ? <Notice tone="error">{events.error.message}</Notice> : null}
      {breakdown.error ? <Notice tone="error">{breakdown.error.message}</Notice> : null}
      {comparison.error ? <Notice tone="error">{comparison.error.message}</Notice> : null}
      <SectionLabel>Period comparison</SectionLabel>
      <Surface><View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Current 30 days</Text><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{comparison.data?.currentCount ?? 0} events · {comparison.data?.currentValue ?? 0} value</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Previous 30 days</Text><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{comparison.data?.previousCount ?? 0} events · {comparison.data?.previousValue ?? 0} value</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 13 }}>Trend</Text><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{comparison.data?.trend === "no_data" ? "No data yet" : comparison.data?.trend === "insufficient_history" ? "Need a previous period" : `${comparison.data?.trend} · ${comparison.data?.changePercent}%`}</Text></View><Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>Change compares recorded event value when present, otherwise event counts. No trend is shown until a previous evidence window exists.</Text></View></Surface>
      <SectionLabel>Campaign performance</SectionLabel>
      {breakdown.data?.length ? breakdown.data.map((campaign) => <Surface key={campaign.campaignId}><View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{campaign.campaignName}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>{campaign.status} · {campaign.contentCount} content item{campaign.contentCount === 1 ? "" : "s"}</Text></View><StatusPill label={campaign.target === null ? "No target" : `${campaign.actual}/${campaign.target}`} tone={campaign.target !== null && campaign.actual >= campaign.target ? "success" : "neutral"} /></View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><StatusPill label={`Events ${campaign.performanceEventCount}`} tone="neutral" />{campaign.leads !== null ? <StatusPill label={`Leads ${campaign.leads}`} tone="neutral" /> : null}{campaign.bookings !== null ? <StatusPill label={`Bookings ${campaign.bookings}`} tone="neutral" /> : null}{campaign.sales !== null ? <StatusPill label={`Sales ${campaign.sales}`} tone="neutral" /> : null}{campaign.revenue !== null ? <StatusPill label={`Revenue ${campaign.revenue}`} tone="neutral" /> : null}{campaign.conversion !== null ? <StatusPill label={`Conversion ${campaign.conversion}%`} tone="neutral" /> : null}</View><Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>{campaign.forecast === null ? "Forecast not available: comparable campaign evidence is not present." : `Forecast ${campaign.forecast}`}</Text></View></Surface>) : <EmptyState title="No campaign performance yet" body="Campaign breakdowns appear after a campaign is created and real events are linked to it. Unsupported metrics remain blank rather than estimated." />}
      <SectionLabel>Event history</SectionLabel>
      {events.data?.length ? events.data.map((event) => <Surface key={event.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{event.eventType}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>{new Date(event.occurredAt).toLocaleString()}</Text></View><StatusPill label={event.value === null ? "No value" : String(event.value)} tone="neutral" /></View></Surface>) : <EmptyState title="No actuals yet" body="Record a business event or connect an approved data source. Forecasts will remain unavailable until evidence exists." />}
      <SectionLabel>Learning</SectionLabel>
      {learning.data?.length ? learning.data.map((insight) => <Surface key={insight.id}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{insight.category}</Text><Text style={{ color: brand.text, fontSize: 14, lineHeight: 20 }}>{insight.insight}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>Confidence: {insight.confidence ?? "Not scored"}</Text></Surface>) : <EmptyState title="No learning signals yet" body="Once actual events and content results accumulate, the learning layer can surface evidence-backed patterns." />}
    </View>
  </ScreenShell>;
}
