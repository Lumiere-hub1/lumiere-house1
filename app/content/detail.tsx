import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

const scoreLabels: [string, string][] = [["hook", "Hook"], ["retention", "Retention"], ["clarity", "Clarity"], ["emotion", "Emotion"], ["brandFit", "Brand fit"], ["naturalness", "Naturalness"], ["visualQuality", "Visual quality"], ["artifactRisk", "Artifact risk"], ["offer", "Offer"], ["cta", "CTA"], ["conversionPotential", "Conversion potential"], ["platformFit", "Platform fit"], ["originality", "Originality"], ["professionalism", "Professionalism"]];

export default function ContentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { workspace, workspaceId } = useWorkspace();
  const detail = trpc.content.detail.useQuery({ workspaceId: workspaceId || 0, contentItemId: Number(params.id) || 0 }, { enabled: Boolean(workspaceId && params.id) });
  const improve = trpc.content.improve.useMutation();
  const submit = trpc.content.submitForApproval.useMutation();
  const utils = trpc.useUtils();

  if (detail.isLoading) return <ScreenShell title="Draft review" eyebrow="Content Studio"><LoadingState /></ScreenShell>;
  if (detail.error) return <ScreenShell title="Draft review" eyebrow="Content Studio"><Notice tone="error">{detail.error.message}</Notice></ScreenShell>;
  if (!workspace || !workspaceId || !detail.data) return <ScreenShell title="Draft review" eyebrow="Content Studio"><EmptyState title="Draft unavailable" body="This content item is not available in the active workspace." /></ScreenShell>;

  const { item, revisions, reviews, approval } = detail.data;
  const revision = revisions[0];
  const review = reviews[0];
  const overallScore = review?.overallScore ?? 0;
  const improveDraft = async () => { await improve.mutateAsync({ workspaceId, contentItemId: item.id }); await utils.content.detail.invalidate({ workspaceId, contentItemId: item.id }); };
  const requestApproval = async () => { await submit.mutateAsync({ workspaceId, contentItemId: item.id, why: "The draft has been reviewed in the Lumière quality engine and is ready for a human decision." }); await utils.content.detail.invalidate({ workspaceId, contentItemId: item.id }); };

  return <ScreenShell title="Draft review" eyebrow={workspace.name} subtitle={`${item.platform} · ${item.type}`}>
    <View style={{ gap: 16 }}>
      {improve.error ? <Notice tone="error">{improve.error.message}</Notice> : null}
      {submit.error ? <Notice tone="error">{submit.error.message}</Notice> : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><StatusPill label={item.status.replace("_", " ")} tone={item.status === "approval_candidate" || item.status === "approved" ? "success" : item.status === "blocked" || item.status === "rejected" ? "risk" : "warning"} /><Text style={{ color: brand.muted, fontSize: 12 }}>Version {revision?.version || 0}</Text></View>
      <Surface><Text style={{ color: brand.text, fontSize: 22, lineHeight: 28, fontWeight: "700" }}>{revision?.headline || "No headline yet"}</Text><Text style={{ color: brand.text, fontSize: 15, lineHeight: 23 }}>{revision?.body || "The content engine has not returned a draft body."}</Text>{revision?.visualBrief ? <View style={{ gap: 4, paddingTop: 4 }}><Text style={{ color: brand.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Visual brief</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>{revision.visualBrief}</Text></View> : null}</Surface>
      {review ? <><SectionLabel>Quality engine</SectionLabel><Surface><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ gap: 4 }}><Text style={{ color: brand.text, fontSize: 20, fontWeight: "700" }}>{overallScore}/10</Text><Text style={{ color: brand.muted, fontSize: 12 }}>Decision: {review.decision.replace("_", " ")}</Text></View><StatusPill label={overallScore >= 8.5 ? "Approval candidate" : overallScore >= 7.5 ? "Review" : overallScore >= 6.8 ? "Improve" : "Reject"} tone={overallScore >= 8.5 ? "success" : overallScore < 6.8 ? "risk" : "warning"} /></View><View style={{ gap: 9 }}>{scoreLabels.map(([key, label]) => { const value = Number((review as any)[key] ?? 0); const adjusted = key === "artifactRisk" ? 10 - value : value; return <View key={key} style={{ gap: 4 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: brand.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: key === "artifactRisk" && value > 5 ? brand.ember : brand.text, fontSize: 12, fontWeight: "700" }}>{value}/10</Text></View><View style={{ height: 6, borderRadius: 999, backgroundColor: brand.sand, overflow: "hidden" }}><View style={{ width: `${adjusted * 10}%`, height: "100%", backgroundColor: key === "artifactRisk" && value > 5 ? brand.ember : brand.rose }} /></View></View>; })}</View><View style={{ gap: 6, paddingTop: 4 }}><Text style={{ color: brand.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Critique</Text><Text style={{ color: brand.text, fontSize: 14, lineHeight: 20 }}>{review.critique || "No critique was recorded."}</Text></View>{Array.isArray(review.weaknesses) && review.weaknesses.length ? <View style={{ gap: 6 }}><Text style={{ color: brand.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Weaknesses to address</Text>{(review.weaknesses as string[]).map((weakness) => <Text key={weakness} style={{ color: brand.text, fontSize: 13, lineHeight: 19 }}>• {weakness}</Text>)}</View> : null}</Surface></> : <Notice>Quality review is not available for this draft yet.</Notice>}
      <View style={{ gap: 10 }}><PrimaryButton label="Improve and rescore" onPress={improveDraft} loading={improve.isPending} icon="autorenew" />{approval ? <Notice tone={approval.status === "approved" ? "success" : approval.status === "rejected" ? "error" : "neutral"}>Approval status: {approval.status}. The state is persisted and publishing is not implied.</Notice> : <SecondaryButton label="Submit for human approval" onPress={requestApproval} disabled={!review || (overallScore ?? 0) < 7.5} icon="fact-check" />}<SecondaryButton label="Open approval inbox" onPress={() => router.push("/approvals" as any)} /></View>
    </View>
  </ScreenShell>;
}
