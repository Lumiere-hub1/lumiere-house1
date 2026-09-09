/**
 * Transactional email via Resend's REST API.
 *
 * Deliberately uses fetch rather than the `resend` SDK: the API surface we need
 * is a single POST, and not adding a dependency keeps the serverless bundle
 * small and removes a supply-chain surface for no loss of function.
 *
 * Nothing in here throws into a request path. Email delivery failing must never
 * fail account creation — a user whose signup succeeded but whose email bounced
 * still has an account, and telling them "signup failed" would be a lie. Every
 * function returns a result the caller reports honestly instead.
 */
import { ENV } from "./env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** How the caller should describe what happened, without inventing success. */
export type EmailDeliveryStatus = "sent" | "not_configured" | "failed";

export type EmailResult = {
  status: EmailDeliveryStatus;
  /** Safe to show a user. Never contains provider internals or the API key. */
  message: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(ENV.resendApiKey && ENV.emailFrom);
}

async function send(input: { to: string; subject: string; html: string; text: string }): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return {
      status: "not_configured",
      message: "Email delivery is not configured, so no email was sent.",
    };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.emailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      // Log the provider's reason for us; never return it to the user, since it
      // can echo configuration details.
      const detail = await response.text().catch(() => "");
      console.error(JSON.stringify({ event: "email_send_failed", status: response.status, detail: detail.slice(0, 500) }));
      return { status: "failed", message: "The verification email could not be sent. You can request another one." };
    }

    return { status: "sent", message: "Verification email sent." };
  } catch (error) {
    console.error(JSON.stringify({ event: "email_send_error", error: error instanceof Error ? error.message : "unknown" }));
    return { status: "failed", message: "The verification email could not be sent. You can request another one." };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function sendVerificationEmail(input: { to: string; name: string | null; verifyUrl: string }): Promise<EmailResult> {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";
  const url = escapeHtml(input.verifyUrl);

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0A0A0A;color:#F3E9DD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <p style="color:#C9AE7B;letter-spacing:1.5px;font-size:12px;font-weight:700;margin:0 0 24px;">LUMIÈRE HOUSE</p>
    <p style="font-size:16px;line-height:24px;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:16px;line-height:24px;margin:0 0 24px;">Confirm this email address to finish setting up your Lumière House account.</p>
    <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#C9AE7B;color:#0A0A0A;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;">Confirm my email</a></p>
    <p style="font-size:13px;line-height:20px;color:#9C9086;margin:0 0 8px;">Or paste this link into your browser:</p>
    <p style="font-size:13px;line-height:20px;color:#9C9086;word-break:break-all;margin:0 0 24px;">${url}</p>
    <p style="font-size:13px;line-height:20px;color:#9C9086;margin:0;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
  </div>
</body></html>`;

  const text = [
    greeting,
    "",
    "Confirm this email address to finish setting up your Lumière House account:",
    input.verifyUrl,
    "",
    "This link expires in 24 hours. If you didn't create this account, you can ignore this email.",
  ].join("\n");

  return send({ to: input.to, subject: "Confirm your email — Lumière House", html, text });
}
