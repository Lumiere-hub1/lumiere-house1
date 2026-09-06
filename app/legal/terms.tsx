import { Text, View } from "react-native";
import { ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";

export default function TermsScreen() {
  return (
    <ScreenShell title="Terms of Service" eyebrow="Lumière House" subtitle="Last updated: 2026">
      <View style={{ gap: 16 }}>
        <Surface>
          <Text style={{ color: brand.ink, fontSize: 15, lineHeight: 22 }}>
            By creating an account or using Lumière House ("the Service"), you agree to these Terms
            of Service.
          </Text>
        </Surface>

        <SectionLabel>Using the Service</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            You are responsible for the accuracy of information you enter, for keeping your login
            credentials secure, and for any activity that happens under your account. You agree
            not to use the Service to violate any law, to abuse, scrape, or overload the platform,
            or to misuse any third-party integration you connect through it.
          </Text>
        </Surface>

        <SectionLabel>Third-party connections</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            Some features let you connect third-party platforms (such as TikTok). Your use of
            those platforms remains subject to their own terms. We only act on your behalf to the
            extent you explicitly authorize.
          </Text>
        </Surface>

        <SectionLabel>No guarantee of results</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            Forecasts, recommendations, and estimates provided by the Service are directional and
            are not guarantees of business outcomes.
          </Text>
        </Surface>

        <SectionLabel>Termination</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            You may stop using the Service and request account deletion at any time. We may
            suspend or terminate accounts that violate these terms.
          </Text>
        </Surface>

        <SectionLabel>Contact</SectionLabel>
        <Surface>
          <Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>
            Questions about these terms can be sent to{" "}
            <Text style={{ fontWeight: "700", color: brand.ink }}>roselureb@gmail.com</Text>.
          </Text>
        </Surface>
      </View>
    </ScreenShell>
  );
}
