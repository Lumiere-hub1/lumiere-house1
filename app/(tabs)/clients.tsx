import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Field, EmptyState, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/hooks/use-workspace";

export default function ClientCareScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const clients = trpc.clients.list.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const create = trpc.clients.create.useMutation();
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState("");
  const [consent, setConsent] = useState<"unknown" | "granted" | "revoked">("unknown");
  const consentedCount = useMemo(() => clients.data?.filter((client) => client.consentStatus === "granted").length || 0, [clients.data]);

  const save = async () => {
    if (!workspaceId || name.trim().length < 2) return;
    await create.mutateAsync({ workspaceId, name: name.trim(), email: email.trim() || undefined, segment: segment.trim() || undefined, consentStatus: consent });
    await utils.clients.list.invalidate({ workspaceId });
    setName(""); setEmail(""); setSegment(""); setConsent("unknown"); setShowForm(false);
  };

  if (loading || clients.isLoading) return <ScreenShell title="Client Care" eyebrow="Relationships"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Client Care" eyebrow="Relationships"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Client Care" eyebrow={workspace.name} subtitle="Remember the relationship, respect the permission, and follow up with intention." action={<StatusPill label={`${consentedCount} consented`} tone={consentedCount ? "success" : "neutral"} />}>
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.border }}><Text style={{ color: brand.text, fontSize: 17, fontWeight: "700" }}>Helpful, never intrusive.</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>Outbound recommendations respect consent, quiet hours, customer preferences, and workspace approval rules.</Text></Surface>
      <PrimaryButton label={showForm ? "Close client form" : "Add a client"} onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "person-add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="Name" value={name} onChangeText={setName} placeholder="Customer name" /><Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Optional" /><Field label="Segment" value={segment} onChangeText={setSegment} placeholder="VIP, inactive, new…" /><Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>Outbound consent</Text><View style={{ flexDirection: "row", gap: 8 }}>{(["unknown", "granted", "revoked"] as const).map((value) => <Pressable key={value} onPress={() => setConsent(value)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: consent === value ? brand.rose : brand.border, backgroundColor: consent === value ? `${brand.rose}18` : "transparent" }}><Text style={{ color: brand.text, fontSize: 12, fontWeight: consent === value ? "700" : "500" }}>{value}</Text></Pressable>)}</View><PrimaryButton label="Save client" onPress={save} loading={create.isPending} disabled={name.trim().length < 2} icon="check" />{create.error ? <Notice tone="error">{create.error.message}</Notice> : null}</View></Surface> : null}
      {clients.error ? <Notice tone="error">{clients.error.message}</Notice> : null}
      <SectionLabel>Relationship list</SectionLabel>
      {clients.data?.length ? clients.data.map((client) => <Pressable key={client.id} onPress={() => router.push({ pathname: "/client/detail" as any, params: { id: String(client.id) } })} style={({ pressed }) => pressed && { opacity: 0.7 }}><Surface><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{client.name}</Text><Text style={{ color: brand.muted, fontSize: 13 }}>{client.segment || "Unsegmented"}{client.email ? ` · ${client.email}` : ""}</Text></View><StatusPill label={client.consentStatus} tone={client.consentStatus === "granted" ? "success" : client.consentStatus === "revoked" ? "risk" : "warning"} /></View><Text style={{ color: brand.muted, fontSize: 12 }}>Last visit: {client.lastVisitAt ? new Date(client.lastVisitAt).toLocaleDateString() : "Not recorded"} · Last contact: {client.lastContactedAt ? new Date(client.lastContactedAt).toLocaleDateString() : "Not recorded"}</Text></Surface></Pressable>) : <EmptyState title="No clients yet" body="Add the first customer record when you are ready. Permission and preferences are part of the record from day one." />}
    </View>
  </ScreenShell>;
}
