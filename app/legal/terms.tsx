import { ScrollView, Text } from "react-native";
import { ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";

export default function TermsOfServiceScreen() {
  return <ScreenShell title="Terms of Service" eyebrow="Lumière House" subtitle="Last updated: 2026">
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        By creating an account or using Lumière House ("the Service"), you agree to these terms.
      </Text></Surface>

      <SectionLabel>The service</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        Lumière House helps beauty and wellness businesses track goals, clients, and content, and,
        where you explicitly connect and authorize a platform such as TikTok, review and schedule
        content for that platform. Publishing or sending anything on your behalf only happens after
        your explicit in-app approval.
      </Text></Surface>

      <SectionLabel>Your responsibilities</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        You are responsible for the accuracy of information you enter, for keeping your login
        credentials secure, and for complying with the terms of any third-party platform (such as
        TikTok's own Terms of Service) you choose to connect.
      </Text></Surface>

      <SectionLabel>Account and data</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        You may request export or deletion of your data at any time. We may suspend accounts used
        in violation of these terms or of a connected platform's policies.
      </Text></Surface>

      <SectionLabel>No warranty</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        The Service is provided "as is." Forecasts and recommendations shown in the app are
        directional, not guarantees of business results.
      </Text></Surface>

      <SectionLabel>Changes</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 14, lineHeight: 21 }}>
        We may update these terms from time to time; continued use of the Service after a change
        means you accept the updated terms.
      </Text></Surface>
    </ScrollView>
  </ScreenShell>;
}
