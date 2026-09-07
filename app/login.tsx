import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Field, Notice, PrimaryButton, ScreenShell, SecondaryButton, brand } from "@/components/lumiere-ui";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation();
  const valid = email.includes("@") && password.length > 0;

  const submit = async () => {
    if (!valid) return;
    try {
      const result = await login.mutateAsync({ email: email.trim(), password });
      await Auth.setSessionToken(result.sessionToken);
      await Auth.setUserInfo(result.user);
      router.replace("/");
    } catch {
      // The mutation error is rendered below; no optimistic success is shown.
    }
  };

  return <ScreenShell title="Welcome back" eyebrow="Lumière House" subtitle="A calmer way to run the marketing work that moves your business forward." scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ gap: 18, paddingTop: 28 }}>
        {login.error ? <Notice tone="error">{login.error.message}</Notice> : null}
        <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@business.com" returnKeyType="next" />
        <Field label="Password" secureToggle autoComplete="password" value={password} onChangeText={setPassword} placeholder="Your password" returnKeyType="done" onSubmitEditing={submit} />
        <PrimaryButton label="Sign in" onPress={submit} loading={login.isPending} disabled={!valid} icon="arrow-forward" />
        <Link href={"/reset-password" as any} asChild><Text style={{ color: brand.rose, textAlign: "center", fontWeight: "700", padding: 8 }}>Forgot your password?</Text></Link>
        <View style={{ height: 1, backgroundColor: brand.border, marginVertical: 6 }} />
        <Text style={{ color: brand.muted, textAlign: "center", fontSize: 13, lineHeight: 19 }}>New to Lumière House?</Text>
        <Link href={"/signup" as any} asChild><View><SecondaryButton label="Create an account" onPress={() => router.push("/signup" as any)} /></View></Link>
      </View>
    </KeyboardAvoidingView>
  </ScreenShell>;
}
