import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

/**
 * Persistent reminder that the signed-in account's email is not yet confirmed,
 * with a resend control.
 *
 * Self-hiding: renders nothing when there is no signed-in user, while the
 * identity is still loading, or once the address is confirmed. That is what
 * makes it safe to mount from ScreenShell, so it follows the user across the
 * app rather than living on one screen they might never revisit.
 *
 * This is a reminder, not the enforcement. The server independently refuses
 * the gated actions through verifiedWorkspaceProcedure — a banner that a
 * client could simply not render would be no protection at all.
 */
export function UnverifiedEmailBanner() {
  const colors = useColors();
  const me = trpc.auth.me.useQuery(undefined, {
    // The banner is decoration on top of whatever the screen is doing; a
    // failure here should never surface an error to the user.
    retry: false,
  });
  const resend = trpc.auth.resendVerification.useMutation();
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  if (me.isLoading || !me.data || me.data.emailVerified) return null;

  const submit = async () => {
    try {
      const result = await resend.mutateAsync();
      setSentMessage(result.message);
    } catch {
      // Rendered from resend.error below.
    }
  };

  return (
    <View
      accessibilityRole="alert"
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.primary}50`,
        backgroundColor: `${colors.primary}18`,
        padding: 12,
        gap: 8,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <MaterialIcons name="mark-email-unread" size={18} color={colors.primary} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>Confirm your email address</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            {me.data.email ? `We sent a link to ${me.data.email}. ` : ""}
            Content generation and platform connections stay locked until it is confirmed.
          </Text>
        </View>
      </View>
      {sentMessage ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{sentMessage}</Text> : null}
      {resend.error ? <Text style={{ color: colors.error, fontSize: 12, lineHeight: 18 }}>{resend.error.message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Resend confirmation email"
        disabled={resend.isPending}
        onPress={submit}
        style={({ pressed }) => [
          { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.primary },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
          {resend.isPending ? "Sending…" : "Resend confirmation email"}
        </Text>
      </Pressable>
    </View>
  );
}
