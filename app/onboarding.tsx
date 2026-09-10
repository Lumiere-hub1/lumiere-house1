import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { Field, Notice, PrimaryButton, ScreenShell, SecondaryButton, StatusPill, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";

const outcomes = [
  { value: "customers", label: "More customers" },
  { value: "bookings", label: "More bookings" },
  { value: "sales", label: "More sales" },
  { value: "leads", label: "More leads" },
  { value: "launch", label: "Launch a product" },
  { value: "content", label: "Create content" },
  { value: "retention", label: "Bring customers back" },
] as const;

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [products, setProducts] = useState("");
  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState<(typeof outcomes)[number]["value"]>("customers");
  const [target, setTarget] = useState("30");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const createWorkspace = trpc.workspaces.create.useMutation();
  const updateBusiness = trpc.workspaces.updateBusiness.useMutation();
  const createGoal = trpc.goals.create.useMutation();

  const canContinue = useMemo(() => {
    if (step === 1) return businessName.trim().length >= 2 && industry.trim().length >= 2;
    if (step === 2) return products.trim().length >= 3;
    if (step === 3) return audience.trim().length >= 3;
    return Number(target) > 0;
  }, [step, businessName, industry, products, audience, target]);

  const finish = async () => {
    if (!canContinue) return;
    setError("");
    try {
      const workspace = await createWorkspace.mutateAsync({ name: businessName.trim(), industry: industry.trim(), location: location.trim() || undefined });
      await updateBusiness.mutateAsync({ workspaceId: workspace.id, name: businessName.trim(), industry: industry.trim(), location: location.trim() || undefined, productsServices: products.trim(), targetCustomer: audience.trim() });
      await createGoal.mutateAsync({ workspaceId: workspace.id, title: `${outcomes.find((item) => item.value === outcome)?.label || "Growth"} in the next 30 days`, goalType: outcome, period: "Next 30 days", target: Number(target) });
      // Drop the cached workspace list before navigating. "/" chooses between
      // the app and this screen from that cache, which was filled with an empty
      // list on the way in and stays fresh for 30s — so it would send the user
      // straight back here, remounted at step 1 with everything they typed
      // gone, despite the workspace having been created. Reset rather than
      // invalidate: invalidate leaves the stale empty list readable, and "/"
      // does not wait for a background refetch before deciding.
      await utils.workspaces.list.reset();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not create your workspace. Nothing was marked complete.");
    }
  };

  // Scrolls, unlike the other auth screens. Step 4 lists seven outcomes plus a
  // target field, and with the unconfirmed-email banner above it the content
  // runs past 1000px — taller than a phone viewport. Held in a plain View it
  // was clipped with no scrollbar, so "Create workspace" and "Back" were
  // simply unreachable and setup could not be completed at all.
  return <ScreenShell title="Set up your house" eyebrow={`Step ${step} of 4`} subtitle="Start with the essentials. You can refine your business memory later.">
    {/* No flex:1 here: inside ScreenShell's ScrollView that resolves to
        flex-basis 0 and collapses the form to nothing. Height comes from the
        content instead, and the ScrollView provides the overflow. */}
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ gap: 16, paddingTop: 22 }}>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {step === 1 ? <><Field label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Lumière Studio" autoCapitalize="words" /><Field label="Industry" value={industry} onChangeText={setIndustry} placeholder="Wellness, retail, services…" /><Field label="Location" value={location} onChangeText={setLocation} placeholder="City or region" /></> : null}
        {step === 2 ? <><Text style={{ color: brand.text, fontSize: 18, fontWeight: "700" }}>What do you sell?</Text><Field label="Products or services" value={products} onChangeText={setProducts} placeholder="Describe the offer in your own words" multiline numberOfLines={5} textAlignVertical="top" /></> : null}
        {step === 3 ? <><Text style={{ color: brand.text, fontSize: 18, fontWeight: "700" }}>Who do you serve?</Text><Field label="Target customer" value={audience} onChangeText={setAudience} placeholder="The people you most want to reach" multiline numberOfLines={5} textAlignVertical="top" /></> : null}
        {step === 4 ? <><Text style={{ color: brand.text, fontSize: 18, fontWeight: "700" }}>What do you want next?</Text><View style={{ gap: 8 }}>{outcomes.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: outcome === item.value }} onPress={() => setOutcome(item.value)} style={({ pressed }) => [{ minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: outcome === item.value ? brand.rose : brand.border, paddingHorizontal: 14, justifyContent: "center", backgroundColor: outcome === item.value ? `${brand.rose}18` : "transparent" }, pressed && { opacity: 0.75 }]}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: brand.text, fontSize: 14, fontWeight: outcome === item.value ? "700" : "500" }}>{item.label}</Text>{outcome === item.value ? <StatusPill label="Selected" tone="success" /> : null}</View></Pressable>)}</View><Field label="Target" hint="Use a count for now; you can add revenue assumptions in Growth." keyboardType="number-pad" value={target} onChangeText={setTarget} placeholder="30" /></> : null}
        {step < 4 ? <PrimaryButton label="Continue" onPress={() => setStep((current) => current + 1)} disabled={!canContinue} icon="arrow-forward" /> : <PrimaryButton label="Create workspace" onPress={finish} loading={createWorkspace.isPending || updateBusiness.isPending || createGoal.isPending} disabled={!canContinue} icon="home" />}
        {step > 1 ? <SecondaryButton label="Back" onPress={() => setStep((current) => current - 1)} /> : null}
      </View>
    </KeyboardAvoidingView>
  </ScreenShell>;
}
