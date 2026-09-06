import { Text, View } from "react-native";
import { ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";

export default function PrivacyPolicyScreen() {
  return (
    <ScreenShell title="Privacy Policy" eyebrow="Lumière House" subtitle="Last updated: 2026">
      <View style={{ gap: 16 }}>
        <Surface>
          <Text style={{ color: brand.ink, fontSize: 15, lineHeight: 22 }}>
            Lumière House ("Lumière", "we", "us") provides revenue-recovery tools for beauty and
            small businesses. This policy explains what information we collect, how we use it,
            and the choices you have.
          </Text>
        </Surface>

        <SectionLabel>Information we collect</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            • Account information you provide directly: name, email, and password (stored as a
            salted, hashed value, never in plain text).{"\n\n"}
            • Business and workspace data you enter: clients, goals, campaigns, content, and
            related records.{"\n\n"}
            • If you connect a third-party platform (such as TikTok), we receive only the account
            information and permissions you explicitly authorize during that platform's login
            flow. We never access more than what you approve, and a connector is never treated as
            connected until authorization actually succeeds.{"\n\n"}
            • Basic technical data such as request logs, used only for security, rate-limiting,
            and diagnosing errors.
          </Text>
        </Surface>

        <SectionLabel>How we use information</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            We use your information to operate your workspace, generate the recommendations and
            content you request, secure your account, and comply with legal obligations. We do not
            sell your personal information. Data obtained through a connected third-party platform
            (for example, TikTok) is used only to provide the specific feature you authorized it
            for, and is not used for unrelated advertising or shared with unrelated third parties.
          </Text>
        </Surface>

        <SectionLabel>Data retention and deletion</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            You may request deletion of your account and associated data at any time. See our Data
            Deletion page for instructions. We retain data only as long as needed to provide the
            service or as required by law.
          </Text>
        </Surface>

        <SectionLabel>Contact</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            Questions about this policy or your data can be sent to{" "}
            <Text style={{ fontWeight: "700", color: brand.ink }}>roselureb@gmail.com</Text>.
          </Text>
        </Surface>
      </View>
    </ScreenShell>
  );
}
