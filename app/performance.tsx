import { useState } from "react";
import { Text, View } from "react-native";
import { EmptyState, Field, LoadingState, Notice, PrimaryButton, ScreenShell, SectionLabel, StatusPill, Surface, brand } from "@/components/lumiere-ui";
import { useWorkspace } from "@/hooks/use-workspace";
import { trpc } from "@/lib/trpc";

const SAMPLE = "eventType,value,occurredAt\nbooking,4,2026-08-27T10:00:00Z\nlead,12,2026-08-27T11:00:00Z";

export default function PerformanceScreen() {
  const { workspace, workspaceId, loading } = useWorkspace();
  const imports = trpc.performance.listImports.useQuery({ workspaceId: workspaceId || 0 }, { enabled: Boolean(workspaceId) });
  const importCsv = trpc.performance.importCsv.useMutation();
  const utils = trpc.useUtils();
  const [source, setSource] = useState("team_csv");
  const [csv, setCsv] = useState(SAMPLE);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    if (!workspaceId || !source.trim() || !csv.trim()) return;
    await importCsv.mutateAsync({ workspaceId, source: source.trim(), csv });
    await Promise.all([utils.performance.listImports.invalidate({ workspaceId }), utils.analytics.list.invalidate({ workspaceId })]);
    setShowForm(false);
  };

  if (loading || imports.isLoading) return <ScreenShell title="Performance imports" eyebrow="Evidence"><LoadingState /></ScreenShell>;
  if (!workspaceId || !workspace) return <ScreenShell title="Performance imports" eyebrow="Evidence"><Notice tone="error">No active workspace is available.</Notice></ScreenShell>;

  return <ScreenShell title="Performance imports" eyebrow={workspace.name} subtitle="Bring in real outcomes without inventing lift.">
    <View style={{ gap: 16 }}>
      <Surface tone="ink" style={{ borderColor: brand.ink }}><Text style={{ color: brand.cream, fontSize: 17, fontWeight: "700" }}>Evidence, not estimates.</Text><Text style={{ color: "#D8C9BA", fontSize: 13, lineHeight: 19 }}>Imports create an auditable batch and only valid rows become analytics events. Rejected rows remain visible.</Text></Surface>
      <PrimaryButton label={showForm ? "Close import form" : "Import performance CSV"} onPress={() => setShowForm((value) => !value)} icon={showForm ? "close" : "add"} />
      {showForm ? <Surface><View style={{ gap: 14 }}><Field label="Source" value={source} onChangeText={setSource} placeholder="booking_export, team_csv…" /><Field label="CSV rows" hint="Columns: eventType,value,occurredAt. Include the header optionally. Dates must be ISO timestamps." multiline value={csv} onChangeText={setCsv} placeholder={SAMPLE} /><PrimaryButton label="Validate and import" onPress={submit} loading={importCsv.isPending} disabled={!source.trim() || !csv.trim()} icon="check" />{importCsv.error ? <Notice tone="error">{importCsv.error.message}</Notice> : null}</View></Surface> : null}
      <SectionLabel>Import history</SectionLabel>
      {imports.data?.length ? imports.data.map((batch) => <Surface key={batch.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700" }}>{batch.source}</Text><Text style={{ color: brand.muted, fontSize: 12 }}>{new Date(batch.createdAt).toLocaleString()} · {batch.acceptedCount}/{batch.rowCount} accepted</Text>{batch.errorMessage ? <Text style={{ color: brand.muted, fontSize: 12 }}>{batch.errorMessage}</Text> : null}</View><StatusPill label={batch.status} tone={batch.status === "applied" ? "success" : batch.status === "validated" ? "warning" : "neutral"} /></View></Surface>) : <EmptyState title="No imported performance yet" body="Connect an approved provider or import an export from your booking, commerce, or campaign system." />}
    </View>
  </ScreenShell>;
}
