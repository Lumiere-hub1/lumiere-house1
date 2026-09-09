import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Field, Notice, PrimaryButton, ScreenShell, brand } from "@/components/lumiere-ui";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";

function passwordHint(value: string) {
  const checks = [value.length >= 8, /[A-Z]/.test(value), /[a-z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)];
  return `${checks.filter(Boolean).length}/5 password requirements met`;
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signup = trpc.auth.signup.useMutation();
  const valid = useMemo(() => name.trim().length >= 2 && email.includes("@") && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password), [name, email, password]);

  const submit = async () => {
    if (!valid) return;
    try {
      const result = await signup.mutateAsync({ name: name.trim(), email: email.trim(), password });
      await Auth.setSessionToken(result.sessionToken);
      await Auth.setUserInfo(result.user);
      // Straight to onboarding rather than "/". A brand-new account never has a
      // workspace, so "/" could only bounce through its own auth and workspace
      // lookups to land here anyway — and if either came back empty for any
      // reason it rendered the public landing page instead, which reads as
      // being dumped back on the signup screen.
      router.replace("/onboarding" as any);
    } catch {
      // The mutation error is rendered below.
    }
  };

  return <ScreenShell title="Create your workspace" eyebrow="Start simply" subtitle="Tell us who you are. We will learn the rest as you go." scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ gap: 16, paddingTop: 24 }}>
        {signup.error ? <Notice tone="error">{signup.error.message}</Notice> : null}
        <Field label="Your name" autoCapitalize="words" autoComplete="name" value={name} onChangeText={setName} placeholder="Alex Morgan" />
        <Field label="Work email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@business.com" />
        <Field label="Password" secureToggle autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="Create a strong password" hint={passwordHint(password)} />
        <Text style={{ color: brand.muted, fontSize: 12, lineHeight: 18 }}>Use 8+ characters with uppercase, lowercase, a number, and a special character. Your password is hashed before it is stored.</Text>
        <PrimaryButton label="Create account" onPress={submit} loading={signup.isPending} disabled={!valid} icon="arrow-forward" />
        <Link href={"/login" as any} asChild><Text style={{ color: brand.rose, textAlign: "center", fontWeight: "700", padding: 8 }}>Already have an account? Sign in</Text></Link>
      </View>
    </KeyboardAvoidingView>
  </ScreenShell>;
}
