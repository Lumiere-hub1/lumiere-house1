import { Linking, Text, View } from "react-native";
import { PrimaryButton, ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";

export default function DataDeletionScreen() {
  const emailSupport = () =>
    Linking.openURL(
      "mailto:roselureb@gmail.com?subject=Lumi%C3%A8re%20House%20-%20Data%20Deletion%20Request",
    ).catch(() => undefined);

  return (
    <ScreenShell
      title="Data Deletion"
      eyebrow="Lumière House"
      subtitle="How to request deletion of your account and data"
    >
      <View style={{ gap: 16 }}>
        <Surface>
          <Text style={{ color: brand.ink, fontSize: 15, lineHeight: 22 }}>
            You can request full deletion of your Lumière House account and all associated data at
            any time, including any data received from a connected third-party platform such as
            TikTok.
          </Text>
        </Surface>

        <SectionLabel>How to request deletion</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            Email us at roselureb@gmail.com with the subject "Data Deletion Request" from the email
            address associated with your account. We will confirm your identity and permanently
            delete your account, workspace data, and any stored third-party authorization tokens
            within 30 days.
          </Text>
          <PrimaryButton label="Email a deletion request" onPress={emailSupport} icon="mail" />
        </Surface>

        <SectionLabel>What gets deleted</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            Your account, workspace records, client and campaign data, generated content, and any
            connected-platform tokens or permissions are permanently removed. Data we are legally
            required to retain (for example, for fraud prevention or tax records) may be kept only
            as long as legally required, and separately from your active account.
          </Text>
        </Surface>
      </View>
    </ScreenShell>
  );
}
