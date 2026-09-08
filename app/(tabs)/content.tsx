import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Field, EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

const platforms = ["instagram", "tiktok", "youtube", "facebook", "pinterest", "linkedin", "email"] as const;
const types = ["social_post", "advertisement", "email", "video", "copy"] as const;

export default function ContentStudioScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const content = trpc.content.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const goals = trpc.goals.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const generate = trpc.content.generate.useMutation();
  const utils = trpc.useUtils();
  const [outcome, setOutcome] = useState("");
  const [offer, setOffer] = useState("");
  const [message, setMessage] = useState("");
  const [cta, setCta] = useState("");
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("instagram");
  const [type, setType] = useState<(typeof types)[number]>("social_post");
  const [showForm, setShowForm] = useState(true);

  const submit = async () => {
    if (!workspaceId || outcome.trim().length < 8) return;
    try {
      const result = await generate.mutateAsync({ workspaceId, goalId: goals.data?.[0]?.id, type, platform, desiredOutcome: outcome.trim(), offer: offer.trim() || undefined, message: message.trim() || undefined, cta: cta.trim() || undefined });
      await utils.content.list.invalidate({ workspaceId });
      if (result?.item.id) router.push({ pathname: "/content/detail" as any, params: { id: String(result.item.id) } });
    } catch {
      // The mutation error is rendered below; no draft is treated as successful.
    }
  };

  if (loading || content.isLoading) return <ScreenShell title="Content Studio" eyebrow="Production house"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Content Studio" eyebrow="Production house"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Content Studio" eyebrow={workspace.name} subtitle="Start with what you are trying to achieve. Lumière handles the production brief and quality pass." scroll>
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.border }}><Text style={{ color: brand.text, fontSize: 17, fontWeight: "700" }}>Describe the outcome.</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>No model selection. No prompt engineering. Just the business result you want the work to support.</Text></Surface>
      <PrimaryButton label={showForm ? "Close brief" : "Start a new brief"} onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="What are you trying to achieve?" hint="For example: fill four open appointment slots next Thursday." value={outcome} onChangeText={setOutcome} placeholder="I want to…" multiline numberOfLines={4} textAlignVertical="top" /><Field label="Offer or product" value={offer} onChangeText={setOffer} placeholder="Optional" /><Field label="Key message" value={message} onChangeText={setMessage} placeholder="Optional" multiline numberOfLines={3} textAlignVertical="top" /><Field label="Call to action" value={cta} onChangeText={setCta} placeholder="Book now, learn more…" /><View style={{ gap: 8 }}><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>Platform</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{platforms.map((item) => <Pressable key={item} onPress={() => setPlatform(item)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: platform === item ? brand.rose : brand.border, backgroundColor: platform === item ? `${brand.rose}18` : "transparent" }}><Text style={{ color: brand.text, fontSize: 12, fontWeight: platform === item ? "700" : "500" }}>{item}</Text></Pressable>)}</View></View><View style={{ gap: 8 }}><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>Format</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{types.map((item) => <Pressable key={item} onPress={() => setType(item)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: type === item ? brand.rose : brand.border, backgroundColor: type === item ? `${brand.rose}18` : "transparent" }}><Text style={{ color: brand.text, fontSize: 12, fontWeight: type === item ? "700" : "500" }}>{item.replace("_", " ")}</Text></Pressable>)}</View></View><PrimaryButton label="Generate and quality-check" onPress={submit} loading={generate.isPending} disabled={outcome.trim().length < 8} icon="auto-awesome" />{generate.error ? <Notice tone="error">{generate.error.message}</Notice> : null}</View></Surface> : null}
      <SectionLabel>Draft history</SectionLabel>
      {content.error ? <Notice tone="error">{content.error.message}</Notice> : null}
      {content.data?.length ? content.data.map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: "/content/detail" as any, params: { id: String(item.id) } })} style={({ pressed }) => pressed && { opacity: 0.7 }}><Surface><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{item.desiredOutcome}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{item.platform} · {item.type}</Text></View><StatusPill label={item.status.replace("_", " ")} tone={item.status === "approved" || item.status === "published" ? "success" : item.status === "blocked" || item.status === "rejected" ? "risk" : "warning"} /></View><Text style={{ color: brand.muted, fontSize: 12 }}>Updated {new Date(item.updatedAt).toLocaleDateString()}</Text></Surface></Pressable>) : <EmptyState title="No drafts yet" body="Your first brief will appear here after Lumière creates and quality-checks it." />}
    </View>
  </ScreenShell>;
}
