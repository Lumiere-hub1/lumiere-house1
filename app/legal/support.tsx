import { Linking, ScrollView, Text } from "react-native";
import { ScreenShell, SectionLabel, SecondaryButton, Surface, brand } from "@/components/lumiere-ui";

export default function SupportScreen() {
  return <ScreenShell title="Support" eyebrow="Lumière House" subtitle="We're here to help">
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        For account help, data requests, or general questions, contact us at:
      </Text><Text style={{ color: brand.ink, fontSize: 16, fontWeight: "700", marginTop: 8 }}>
        info@glowbyroselure.com
      </Text><SecondaryButton label="Email support" onPress={() => Linking.openURL("mailto:info@glowbyroselure.com")} icon="open-in-new" /></Surface>

      <SectionLabel>Related</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        See our{" "}
        <Text style={{ color: brand.ink, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/privacy")}>Privacy Policy</Text>,{" "}
        <Text style={{ color: brand.ink, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/terms")}>Terms of Service</Text>, and{" "}
        <Text style={{ color: brand.ink, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/data-deletion")}>Data Deletion</Text> pages.
      </Text></Surface>
    </ScrollView>
  </ScreenShell>;
}
