import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Field, Notice, PrimaryButton, ScreenShell, SecondaryButton, brand } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const reset = trpc.auth.requestPasswordReset.useMutation();
  const valid = useMemo(() => email.includes("@"), [email]);

  const submit = async () => {
    if (!valid) return;
    try {
      const result = await reset.mutateAsync({ email: email.trim() });
      setToken(result.developmentToken || null);
    } catch {
      // The mutation error is rendered below.
    }
  };

  return <ScreenShell title="Reset access" eyebrow="Account security" subtitle="We will only show a confirmation after the reset request is processed." scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ gap: 18, paddingTop: 28 }}>
        {reset.error ? <Notice tone="error">{reset.error.message}</Notice> : null}
        {reset.isSuccess ? <Notice tone={token ? "neutral" : "success"}>{reset.data.message}</Notice> : null}
        <Field label="Work email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@business.com" />
        <PrimaryButton label="Request reset link" onPress={submit} loading={reset.isPending} disabled={!valid} icon="mail-outline" />
        {token ? <View style={{ gap: 10 }}><Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>Development-only token for local verification. In production, configure an email delivery provider before exposing reset links.</Text><SecondaryButton label="Continue with development token" onPress={() => router.push({ pathname: "/reset-password/confirm" as any, params: { token } })} /></View> : null}
        <Link href={"/login" as any} asChild><Text style={{ color: brand.rose, textAlign: "center", fontWeight: "700", padding: 8 }}>Back to sign in</Text></Link>
      </View>
    </KeyboardAvoidingView>
  </ScreenShell>;
}
