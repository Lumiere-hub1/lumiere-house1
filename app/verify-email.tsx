import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { LoadingState, Notice, PrimaryButton, ScreenShell, SecondaryButton } from "@/components/lumiere-ui";
import { trpc } from "@/lib/trpc";

/**
 * Landing screen for the link in the verification email.
 *
 * The token is consumed automatically on mount rather than behind a button:
 * the user already expressed intent by clicking the link in their inbox, and
 * asking them to confirm twice is friction for no security gain. The mutation
 * is fired exactly once — verification tokens are single-use, so a second call
 * would report "invalid or expired" for an address that was just confirmed.
 */
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const verify = trpc.auth.verifyEmail.useMutation();
  const utils = trpc.useUtils();
  const [done, setDone] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !params.token) return;
    attempted.current = true;
    verify
      .mutateAsync({ token: params.token })
      .then(async () => {
        // Refresh the cached identity so the unverified banner disappears
        // without needing a reload.
        await utils.auth.me.invalidate();
        setDone(true);
      })
      .catch(() => {
        // Rendered from verify.error below.
      });
  }, [params.token, utils, verify]);

  return <ScreenShell title="Confirm your email" eyebrow="Account security" subtitle="One step to finish setting up your account." scroll={false}>
    <View style={{ gap: 18, paddingTop: 28 }}>
      {!params.token ? <Notice tone="error">This link is missing its confirmation token. Open the link from your email again, or request a new one from Settings.</Notice> : null}
      {params.token && verify.isPending ? <LoadingState label="Confirming your email…" /> : null}
      {verify.error ? <Notice tone="error">{verify.error.message}</Notice> : null}
      {done ? <Notice tone="success">Your email address is confirmed. Everything is unlocked.</Notice> : null}
      {done ? <PrimaryButton label="Go to your dashboard" onPress={() => router.replace("/(tabs)" as any)} icon="arrow-forward" /> : null}
      {verify.error ? <SecondaryButton label="Open Settings to resend" onPress={() => router.replace("/settings" as any)} icon="settings" /> : null}
    </View>
  </ScreenShell>;
}
