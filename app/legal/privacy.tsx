import { Linking, ScrollView, Text } from "react-native";
import { ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";

export default function PrivacyPolicyScreen() {
  return <ScreenShell title="Privacy Policy" eyebrow="Lumière House" subtitle="Last updated: 2026">
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Surface><Text style={{ color: brand.text, fontSize: 15, lineHeight: 22 }}>
        Lumière House ("Lumière", "we", "us") provides revenue-recovery software for beauty and
        wellness businesses. This policy explains what information we collect, how we use it, and
        the choices you have.
      </Text></Surface>

      <SectionLabel>What we collect</SectionLabel>
      <Surface><Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>
        Account information you provide (name, email, password); business information you enter
        (business name, goals, clients you add for follow-up); and, if you choose to connect a
        social platform such as TikTok, the basic profile information that platform shares with us
        through its official login process (such as your display name and avatar), solely to
        confirm which account is connected.
      </Text></Surface>

      <SectionLabel>How we use it</SectionLabel>
      <Surface><Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>
        We use this information to operate your account, show you your own business data inside
        Lumière, and, only where you have connected a platform and explicitly approved an action,
        to help you schedule or review content for that platform. We do not sell your data, and we
        do not use TikTok data for advertising or share it with third parties for their own
        purposes.
      </Text></Surface>

      <SectionLabel>Connected platforms (e.g. TikTok)</SectionLabel>
      <Surface><Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>
        When you connect a platform, Lumière only requests the minimum access needed for the
        features you use, through that platform's official authorization screen. You can review
        exactly what was requested at the time of connecting, and you can disconnect at any time
        from Settings. Disconnecting revokes Lumière's access on our side; you can also manage or
        revoke access directly from the platform's own account settings.
      </Text></Surface>

      <SectionLabel>Data deletion</SectionLabel>
      <Surface><Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>
        You can request deletion of your account and associated data at any time. See our{" "}
        <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/data-deletion")}>
          Data Deletion
        </Text>{" "}page for how.
      </Text></Surface>

      <SectionLabel>Contact</SectionLabel>
      <Surface><Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>
        Questions about this policy or your data can be sent to the contact address listed on our{" "}
        <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/support")}>
          Support
        </Text>{" "}page.
      </Text></Surface>
    </ScrollView>
  </ScreenShell>;
}
