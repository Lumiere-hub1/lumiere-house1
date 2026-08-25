import { Linking, Text, View } from "react-native";
import { ScreenShell, SectionLabel, SecondaryButton, Surface, brand } from "@/components/lumiere-ui";

export default function HelpScreen() {
  const openPrivacy = () => Linking.openURL("https://help.manus.im").catch(() => undefined);
  return <ScreenShell title="Help" eyebrow="Lumière House" subtitle="A few principles to keep the system useful, honest, and safe.">
    <View style={{ gap: 16 }}>
      <Surface><Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>Outcome over features</Text><Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>Start with the business result. Lumière turns it into a research, strategy, content, quality, approval, and measurement loop.</Text></Surface>
      <Surface><Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>Human control over autopilot</Text><Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>High-risk actions require approval. A connector is never treated as connected until official authorization succeeds. Publishing and outbound messages are never implied.</Text></Surface>
      <Surface><Text style={{ color: brand.ink, fontSize: 17, fontWeight: "700" }}>Forecasts are not guarantees</Text><Text style={{ color: brand.muted, fontSize: 14, lineHeight: 21 }}>Targets and forecasts are directional. Actuals come from recorded or connected events only.</Text></Surface>
      <SectionLabel>Privacy and support</SectionLabel>
      <Surface><Text style={{ color: brand.ink, fontSize: 15, fontWeight: "700" }}>Need help with access or data?</Text><Text style={{ color: brand.muted, fontSize: 13, lineHeight: 19 }}>Support and data requests are routed to the platform support surface. No request is marked complete from this screen.</Text><SecondaryButton label="Open support center" onPress={openPrivacy} icon="open-in-new" /></Surface>
    </View>
  </ScreenShell>;
}
