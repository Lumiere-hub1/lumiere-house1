import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { brand } from "@/components/lumiere-ui";

const serif = Platform.select({ ios: "ui-serif", android: "serif", default: "Georgia, 'Times New Roman', serif" });

const LEAKS = [
  { icon: "event-repeat" as const, title: "Overdue rebookings", body: "Clients who should have returned but haven't." },
  { icon: "person-off" as const, title: "Inactive clients", body: "Valuable clients who have quietly stopped booking." },
  { icon: "mark-email-unread" as const, title: "Missed leads", body: "People who showed interest but never converted." },
  { icon: "event-busy" as const, title: "Cancellations", body: "Lost appointments that could potentially be recovered." },
  { icon: "schedule" as const, title: "Empty slots", body: "Upcoming availability that could become revenue." },
];

const STEPS = [
  { n: "01", title: "Discover", body: "Lumière connects to your business data and identifies where revenue may be slipping through." },
  { n: "02", title: "Intelligence", body: "AI analyzes clients, appointments, leads, cancellations, and rebooking patterns." },
  { n: "03", title: "Recover", body: "Lumière recommends the highest-value actions — and can help you carry them out." },
];

const AUDIENCES = [
  { icon: "content-cut" as const, label: "Salons" },
  { icon: "spa" as const, label: "Medspas" },
  { icon: "storefront" as const, label: "Beauty studios" },
  { icon: "face-retouching-natural" as const, label: "Estheticians" },
];

const PLANS = [
  { name: "Starter", price: "$39", who: "For solo operators just getting started.", features: ["1 workspace", "Core client tools", "Basic revenue intelligence", "Email support"], highlight: false },
  { name: "Growth", price: "$99", who: "For businesses ready to actively recover and grow revenue.", features: ["Everything in Starter", "Full recovery workflows", "AI recommendations", "Priority support"], highlight: true },
  { name: "Scale", price: "$199", who: "For larger or multi-location businesses.", features: ["Everything in Growth", "Multi-location support", "Advanced automation", "Dedicated onboarding"], highlight: false },
];

export default function LandingPage() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      {/* Nav */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 20 : 56, paddingBottom: 16 }}>
        <Text style={{ fontFamily: serif, fontSize: 20, letterSpacing: 2, color: brand.text }}>LUMIÈRE</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => router.push("/login" as any)} style={{ paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>Sign in</Text>
          </Pressable>
        </View>
      </View>

      {/* Hero */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={{ color: brand.rose, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>AI-POWERED REVENUE OPERATING SYSTEM</Text>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 34, lineHeight: 40, marginTop: 10 }}>
          Your business is making money.{"\n"}
          <Text style={{ color: brand.rose }}>Lumière</Text> finds what you're leaving behind.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 14 }}>
          AI-powered revenue intelligence for salons, spas, medspas, and beauty businesses — built to find lost revenue and help you recover it.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <Pressable onPress={() => router.push("/signup" as any)} style={{ backgroundColor: brand.rose, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: brand.onAccent, fontWeight: "700", fontSize: 14 }}>Get started</Text>
            <MaterialIcons name="arrow-forward" size={16} color={brand.onAccent} />
          </Pressable>
          <Pressable onPress={() => router.push("/login" as any)} style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14 }}>
            <Text style={{ color: brand.text, fontWeight: "600", fontSize: 14 }}>Sign in</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 28, borderRadius: 20, overflow: "hidden", height: 320 }}>
          <Image
            source={require("@/assets/images/founder-hero.jpg")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Revenue leaks */}
      <View style={{ paddingHorizontal: 20, paddingTop: 44 }}>
        <Text style={{ color: brand.rose, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>REVENUE LEAKS</Text>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 24, lineHeight: 30, marginTop: 8 }}>
          Revenue is leaking quietly.{"\n"}<Text style={{ color: brand.rose }}>Lumière makes it visible.</Text>
        </Text>
        <View style={{ marginTop: 18, gap: 10 }}>
          {LEAKS.map((leak) => (
            <View key={leak.title} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <MaterialIcons name={leak.icon} size={20} color={brand.rose} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: brand.text, fontSize: 14, fontWeight: "700" }}>{leak.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{leak.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* How it works */}
      <View style={{ paddingHorizontal: 20, paddingTop: 44 }}>
        <Text style={{ color: brand.rose, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>THE LUMIÈRE ADVANTAGE</Text>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 24, marginTop: 8 }}>How Lumière works</Text>
        <View style={{ marginTop: 18, gap: 14 }}>
          {STEPS.map((step) => (
            <View key={step.n} style={{ flexDirection: "row", gap: 14 }}>
              <Text style={{ fontFamily: serif, color: brand.rose, fontSize: 20 }}>{step.n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: brand.text, fontSize: 15, fontWeight: "700" }}>{step.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2 }}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* AI section */}
      <View style={{ paddingHorizontal: 20, paddingTop: 44 }}>
        <Text style={{ color: brand.rose, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>LUMIÈRE AI</Text>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 24, marginTop: 8 }}>Meet your AI revenue operator.</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>Ask. Analyze. Take action. Lumière thinks like a revenue strategist, so you don't have to.</Text>
        <View style={{ marginTop: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ alignSelf: "flex-end", backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "85%" }}>
            <Text style={{ color: brand.text, fontSize: 13 }}>What should I focus on today?</Text>
          </View>
          <View style={{ alignSelf: "flex-start", backgroundColor: `${brand.rose}18`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "90%" }}>
            <Text style={{ color: brand.text, fontSize: 13, lineHeight: 18 }}>Your clients who are overdue for rebooking are the biggest opportunity right now. I can help draft outreach to them.</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
            {["Review clients", "Create follow-up", "Start campaign"].map((label) => (
              <View key={label} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Text style={{ color: brand.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Built for growing businesses (honest, no fake testimonials) */}
      <View style={{ paddingHorizontal: 20, paddingTop: 44 }}>
        <Text style={{ color: brand.rose, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>WHO IT'S FOR</Text>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 24, marginTop: 8 }}>Built for beauty businesses ready to grow.</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>Lumière is early and growing — now welcoming its founding workspaces.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {AUDIENCES.map((a) => (
            <View key={a.label} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }}>
              <MaterialIcons name={a.icon} size={16} color={brand.rose} />
              <Text style={{ color: brand.text, fontSize: 13, fontWeight: "600" }}>{a.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pricing */}
      <View style={{ paddingHorizontal: 20, paddingTop: 44 }}>
        <Text style={{ color: brand.rose, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>PRICING</Text>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 24, marginTop: 8 }}>Choose how much revenue you want to recover.</Text>
        <View style={{ marginTop: 18, gap: 12 }}>
          {PLANS.map((plan) => (
            <View key={plan.name} style={{ borderRadius: 16, padding: 18, borderWidth: plan.highlight ? 1.5 : 1, borderColor: plan.highlight ? brand.rose : colors.border, backgroundColor: plan.highlight ? `${brand.rose}10` : colors.surface }}>
              {plan.highlight ? <Text style={{ color: brand.rose, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 6 }}>MOST POPULAR</Text> : null}
              <Text style={{ color: brand.text, fontSize: 16, fontWeight: "700" }}>{plan.name}</Text>
              <Text style={{ fontFamily: serif, color: brand.text, fontSize: 26, marginTop: 2 }}>{plan.price}<Text style={{ fontSize: 13, color: colors.muted }}> /month</Text></Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{plan.who}</Text>
              <View style={{ marginTop: 12, gap: 6 }}>
                {plan.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="check" size={14} color={brand.rose} />
                    <Text style={{ color: brand.text, fontSize: 12.5 }}>{f}</Text>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => router.push("/signup" as any)} style={{ marginTop: 14, backgroundColor: plan.highlight ? brand.rose : "transparent", borderWidth: plan.highlight ? 0 : 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: plan.highlight ? brand.onAccent : brand.text, fontWeight: "700", fontSize: 13 }}>Get started</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* Final CTA */}
      <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20, alignItems: "center" }}>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 26, textAlign: "center", lineHeight: 32 }}>Stop leaving revenue behind.</Text>
        <Text style={{ fontFamily: serif, color: brand.rose, fontSize: 20, textAlign: "center", marginTop: 4, fontStyle: "italic" }}>Let Lumière find it.</Text>
        <Pressable onPress={() => router.push("/signup" as any)} style={{ marginTop: 20, backgroundColor: brand.rose, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 }}>
          <Text style={{ color: brand.onAccent, fontWeight: "700", fontSize: 14 }}>Start recovering revenue</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingVertical: 24, paddingBottom: Platform.OS === "web" ? 24 : 40 }}>
        <Text style={{ fontFamily: serif, color: brand.text, fontSize: 15, letterSpacing: 1.5 }}>LUMIÈRE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
          <Pressable onPress={() => router.push("/legal/privacy" as any)}><Text style={{ color: colors.muted, fontSize: 12 }}>Privacy</Text></Pressable>
          <Pressable onPress={() => router.push("/legal/terms" as any)}><Text style={{ color: colors.muted, fontSize: 12 }}>Terms</Text></Pressable>
          <Pressable onPress={() => router.push("/legal/support" as any)}><Text style={{ color: colors.muted, fontSize: 12 }}>Support</Text></Pressable>
          <Pressable onPress={() => router.push("/login" as any)}><Text style={{ color: colors.muted, fontSize: 12 }}>Sign in</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
