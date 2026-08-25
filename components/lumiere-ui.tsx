import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export const brand = {
  ink: "#14100E",
  cream: "#F3E9DD",
  rose: "#B8895F",
  ember: "#C1432A",
  sand: "#E8DCCF",
  border: "#D8C9BA",
  green: "#496451",
  muted: "#6E6259",
};

export function ScreenShell({ title, eyebrow, subtitle, action, children, scroll = true }: { title: string; eyebrow?: string; subtitle?: string; action?: ReactNode; children: ReactNode; scroll?: boolean }) {
  const colors = useColors();
  const content = (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
  return <ScreenContainer containerClassName="bg-background" className="px-4" edges={["top", "left", "right"]}>{scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>{content}</ScrollView> : content}</ScreenContainer>;
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const colors = useColors();
  return <View style={styles.sectionRow}><Text style={[styles.sectionLabel, { color: colors.muted }]}>{children}</Text>{action}</View>;
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, icon }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: keyof typeof MaterialIcons.glyphMap }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.primaryButton, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{icon ? <MaterialIcons name={icon} size={18} color={brand.cream} /> : null}<Text style={styles.primaryButtonText}>{loading ? "Working…" : label}</Text></Pressable>;
}

export function SecondaryButton({ label, onPress, disabled = false, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: keyof typeof MaterialIcons.glyphMap }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, disabled && styles.disabled, pressed && styles.pressed]}>{icon ? <MaterialIcons name={icon} size={18} color={colors.foreground} /> : null}<Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{label}</Text></Pressable>;
}

export function IconButton({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons name={icon} size={21} color={colors.foreground} /></Pressable>;
}

export function Surface({ children, tone = "surface", style }: { children: ReactNode; tone?: "surface" | "ink" | "accent" | "risk"; style?: object }) {
  const colors = useColors();
  const backgroundColor = tone === "ink" ? colors.foreground : tone === "accent" ? colors.primary : tone === "risk" ? `${colors.error}18` : colors.surface;
  return <View style={[styles.surface, { backgroundColor, borderColor: colors.border }, style]}>{children}</View>;
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "risk" }) {
  const colors = useColors();
  const color = tone === "success" ? colors.success : tone === "risk" ? colors.error : tone === "warning" ? colors.warning : colors.muted;
  return <View style={[styles.pill, { backgroundColor: `${color}1A` }]}><Text style={[styles.pillText, { color }]}>{label}</Text></View>;
}

export function Metric({ value, label, detail }: { value: string; label: string; detail?: string }) {
  const colors = useColors();
  return <View style={styles.metric}><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>{detail ? <Text style={[styles.metricDetail, { color: colors.primary }]}>{detail}</Text> : null}</View>;
}

export function RecommendationCard({ title, why, action, impact, confidence, approval, tone = "default", onPress }: { title: string; why: string; action: string; impact: string; confidence: string; approval: string; tone?: "default" | "risk"; onPress?: () => void }) {
  const colors = useColors();
  const card = <Surface tone={tone === "risk" ? "risk" : "surface"}>
    <View style={styles.cardHeader}><View style={styles.cardTitleWrap}><MaterialIcons name={tone === "risk" ? "priority-high" : "auto-awesome"} size={18} color={tone === "risk" ? colors.error : colors.primary} /><Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text></View>{onPress ? <MaterialIcons name="chevron-right" size={20} color={colors.muted} /> : null}</View>
    <Text style={[styles.cardMeta, { color: colors.muted }]}><Text style={styles.metaStrong}>Why now: </Text>{why}</Text>
    <Text style={[styles.cardMeta, { color: colors.muted }]}><Text style={styles.metaStrong}>Do this: </Text>{action}</Text>
    <View style={styles.detailGrid}><Detail label="Impact" value={impact} /><Detail label="Confidence" value={confidence} /><Detail label="Approval" value={approval} /></View>
  </Surface>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>{card}</Pressable> : card;
}

function Detail({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.detail}><Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text></View>;
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const colors = useColors();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>{hint ? <Text style={[styles.fieldHint, { color: colors.muted }]}>{hint}</Text> : null}<TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[styles.input, { color: colors.foreground, borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface }]} />{error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}</View>;
}

export function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "error" | "success" }) {
  const colors = useColors();
  const color = tone === "error" ? colors.error : tone === "success" ? colors.success : colors.primary;
  return <View style={[styles.notice, { backgroundColor: `${color}18`, borderColor: `${color}50` }]}><MaterialIcons name={tone === "error" ? "error-outline" : tone === "success" ? "check-circle-outline" : "info-outline"} size={18} color={color} /><Text style={[styles.noticeText, { color: colors.foreground }]}>{children}</Text></View>;
}

export function LoadingState({ label = "Loading your workspace…" }: { label?: string }) {
  const colors = useColors();
  return <View style={styles.centerState}><MaterialIcons name="hourglass-empty" size={24} color={colors.primary} /><Text style={[styles.centerText, { color: colors.muted }]}>{label}</Text></View>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const colors = useColors();
  return <Surface><MaterialIcons name="star-outline" size={22} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.emptyBody, { color: colors.muted }]}>{body}</Text>{action ? <View style={styles.emptyAction}>{action}</View> : null}</Surface>;
}

export const styles = StyleSheet.create({
  content: { gap: 20, paddingTop: 12, paddingBottom: 28 },
  scrollContent: { paddingBottom: 36 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  headerCopy: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, fontWeight: "700" },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: -6 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.25, fontWeight: "700", textTransform: "uppercase" },
  primaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: brand.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: brand.cream, fontSize: 15, fontWeight: "700" },
  secondaryButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
  iconButton: { height: 42, width: 42, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  surface: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  metric: { flex: 1, minWidth: 86, gap: 3 },
  metricValue: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  metricLabel: { fontSize: 12, lineHeight: 16 },
  metricDetail: { fontSize: 11, fontWeight: "600" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  cardMeta: { fontSize: 13, lineHeight: 19 },
  metaStrong: { fontWeight: "700" },
  detailGrid: { flexDirection: "row", gap: 12, paddingTop: 2 },
  detail: { flex: 1, gap: 3 },
  detailLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  detailValue: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "700" },
  fieldHint: { fontSize: 12, lineHeight: 17 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errorText: { fontSize: 12, lineHeight: 17 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  centerState: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 72 },
  centerText: { fontSize: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyBody: { fontSize: 14, lineHeight: 20 },
  emptyAction: { marginTop: 4 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.48 },
});
