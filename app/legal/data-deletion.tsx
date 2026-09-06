import { Linking, ScrollView, Text } from "react-native";
import { ScreenShell, SectionLabel, SecondaryButton, Surface, brand } from "@/components/lumiere-ui";

export default function DataDeletionScreen() {
  return <ScreenShell title="Data Deletion" eyebrow="Lumière House" subtitle="How to request deletion of your data">
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        You can request full deletion of your Lumière House account and all associated data
        (business information, clients, content drafts, and any connected-platform metadata we
        stored) at any time.
      </Text></Surface>

      <SectionLabel>How to request deletion</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        Email us at the address on our Support page with the subject line "Delete my data" from the
        email address on your account. We will confirm your identity and complete deletion within
        30 days, and confirm by email once it is done.
      </Text><SecondaryButton label="Open Support page" onPress={() => Linking.openURL("/legal/support")} icon="open-in-new" /></Surface>

      <SectionLabel>Disconnecting a platform (e.g. TikTok)</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        You can disconnect a connected platform yourself at any time from Settings → Connect,
        which removes Lumière's stored access for that platform immediately. You can also revoke
        access directly from that platform's own account settings.
      </Text></Surface>
    </ScrollView>
  </ScreenShell>;
}
