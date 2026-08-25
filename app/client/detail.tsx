import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { EmptyState, Field, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, SecondaryButton, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

export default function ClientDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { workspace, workspaceId } = useWorkspace();
  const clients = trpc.clients.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const update = trpc.clients.update.useMutation();
  const utils = trpc.useUtils();
  const client = useMemo(() => clients.data?.find((item) => item.id === Number(params.id)), [clients.data, params.id]);
  const [notes, setNotes] = useState<string | null>(null);
  const currentNotes = notes ?? client?.notes ?? "";

  if (clients.isLoading) return <ScreenShell title="Client detail" eyebrow="Client Care"><LoadingState /></ScreenShell>;
  if (clients.error) return <ScreenShell title="Client detail" eyebrow="Client Care"><Notice tone="error">{clients.error.message}</Notice></ScreenShell>;
  if (!workspace || !workspaceId || !client) return <ScreenShell title="Client detail" eyebrow="Client Care"><EmptyState title="Client unavailable" body="This customer is not available in the active workspace." /></ScreenShell>;

  const saveNotes = async () => {
    await update.mutateAsync({ workspaceId, clientId: client.id, notes: currentNotes });
    await utils.clients.list.invalidate({ workspaceId });
    setNotes(null);
  };
  const toggleConsent = async () => {
    const next = client.consentStatus === "granted" ? "revoked" : "granted";
    await update.mutateAsync({ workspaceId, clientId: client.id, consentStatus: next });
    await utils.clients.list.invalidate({ workspaceId });
  };

  return <ScreenShell title={client.name} eyebrow={workspace.name} subtitle={client.email || "No email recorded"}>
    <View style={{ gap: 16 }}>
      {update.error ? <Notice tone="error">{update.error.message}</Notice> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><StatusPill label={client.consentStatus} tone={client.consentStatus === "granted" ? "success" : client.consentStatus === "revoked" ? "risk" : "warning"} /><SecondaryButton label={client.consentStatus === "granted" ? "Revoke consent" : "Grant consent"} onPress={toggleConsent} /></View>
      <SectionLabel>Timeline</SectionLabel>
      <Surface><View style={{ gap: 12 }}>{[{ label: "Added to workspace", value: client.createdAt }, { label: "Last visit", value: client.lastVisitAt }, { label: "Last contact", value: client.lastContactedAt }].map((event) => <View key={event.label} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: event.value ? brand.rose : brand.border }} /><View style={{ flex: 1 }}><Text style={{ color: brand.ink, fontSize: 14, fontWeight: "700" }}>{event.label}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>{event.value ? new Date(event.value).toLocaleString() : "Not recorded"}</Text></View></View>)}</View></Surface>
      <SectionLabel>Notes and preferences</SectionLabel>
      <Surface><Field label="Customer notes" value={currentNotes} onChangeText={setNotes} placeholder="What should the team remember?" multiline numberOfLines={5} textAlignVertical="top" /><PrimaryButton label="Save notes" onPress={saveNotes} loading={update.isPending} icon="save" /></Surface>
      <SectionLabel>Suggested next step</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>{client.consentStatus === "granted" ? "Review a thoughtful follow-up" : "Confirm permission before outreach"}</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>{client.consentStatus === "granted" ? `Lumière can help draft a message for ${client.name}, but it will not send anything without an approved connector and the required review.` : "No outbound message should be drafted for sending until consent is known and the business policy allows it."}</Text>{client.consentStatus === "granted" ? <SecondaryButton label="Draft in Content Studio" onPress={() => router.push("/content" as any)} icon="edit" /> : null}</Surface>
    </View>
  </ScreenShell>;
}
