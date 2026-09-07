import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Field, Notice, PrimaryButton, ScreenShell } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";

export default function ResetConfirmScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const mutation = trpc.auth.resetPassword.useMutation();
  const valid = useMemo(() => password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password), [password]);

  const submit = async () => {
    if (!params.token || !valid) return;
    try {
      await mutation.mutateAsync({ token: params.token, password });
      router.replace("/login" as any);
    } catch {
      // The mutation error is rendered below.
    }
  };

  return <ScreenShell title="Choose a new password" eyebrow="Account security" subtitle="Use a strong password that you do not reuse elsewhere." scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ gap: 18, paddingTop: 28 }}>
        {!params.token ? <Notice tone="error">No reset token was provided. Request a new reset link.</Notice> : null}
        {mutation.error ? <Notice tone="error">{mutation.error.message}</Notice> : null}
        <Field label="New password" secureToggle autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="Create a strong password" hint="8+ characters, uppercase, lowercase, number, and special character." />
        <PrimaryButton label="Update password" onPress={submit} loading={mutation.isPending} disabled={!params.token || !valid} icon="lock-outline" />
      </View>
    </KeyboardAvoidingView>
  </ScreenShell>;
}
