import { Linking, ScrollView, Text, View } from "react-native";
import { ScreenShell, SectionLabel, SecondaryButton, Surface, brand } from "@/components/lumiere-ui";
import { SUPPORT_CHANNELS } from "@/shared/support";

/**
 * The single place a user is sent for help. Replaces the previous link out to
 * help.manus.im, an unrelated third party's help centre left over from the
 * project scaffolding.
 *
 * Every channel is rendered from configuration and omitted when unset, so an
 * unconfigured channel simply does not appear rather than presenting a dead
 * button. Email is always present because it has a real, known address.
 */
export default function SupportScreen() {
  const { telegramUsername, whatsappNumber, email } = SUPPORT_CHANNELS;

  // Describes what is actually on the page. A fixed "three ways to reach us"
  // read as a broken promise wherever a channel was unconfigured — which is
  // every environment that has not been given the public support variables.
  const subtitle = telegramUsername
    ? "The Telegram bot answers common questions instantly. A person picks up the rest."
    : whatsappNumber
      ? "Message us on WhatsApp, or email for anything needing a written record."
      : "Email us and a person will pick it up.";

  return <ScreenShell title="Support" eyebrow="Lumière House" subtitle={subtitle}>
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      {telegramUsername ? (
        <Surface>
          <View style={{ gap: 8 }}>
            <Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>Telegram — fastest</Text>
            <Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>
              Our support bot answers common questions straight away, any time of day. Anything it can&apos;t handle reaches a person.
            </Text>
            <Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>
              Never send a password, a payment card, or a verification code — we will never ask for one.
            </Text>
            <SecondaryButton
              label={`Open @${telegramUsername}`}
              onPress={() => Linking.openURL(`https://t.me/${telegramUsername}`)}
              icon="chat"
            />
          </View>
        </Surface>
      ) : null}

      {whatsappNumber ? (
        <Surface>
          <View style={{ gap: 8 }}>
            <Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>WhatsApp</Text>
            <Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>Message us directly. Replies come from a person, during working hours.</Text>
            <SecondaryButton
              label="Open WhatsApp"
              // Already digits only — normaliseWhatsappNumber handles the
              // "+1 742-…" and full-wa.me-link forms in shared/support.ts.
              onPress={() => Linking.openURL(`https://wa.me/${whatsappNumber}`)}
              icon="chat-bubble-outline"
            />
          </View>
        </Surface>
      ) : null}

      <Surface>
        <View style={{ gap: 8 }}>
          <Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>Email</Text>
          <Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>
            Best for account help, billing, and data requests — anything needing a written record.
          </Text>
          <Text style={{ color: brand.text, fontSize: 15, fontWeight: "700" }}>{email}</Text>
          <SecondaryButton label="Email support" onPress={() => Linking.openURL(`mailto:${email}`)} icon="mail-outline" />
        </View>
      </Surface>

      <SectionLabel>Related</SectionLabel>
      <Surface><Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>
        See our{" "}
        <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/privacy")}>Privacy Policy</Text>,{" "}
        <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/terms")}>Terms of Service</Text>, and{" "}
        <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/data-deletion")}>Data Deletion</Text> pages.
      </Text></Surface>
    </ScrollView>
  </ScreenShell>;
}
