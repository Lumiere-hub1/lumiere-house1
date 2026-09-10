import { Linking, ScrollView, Text, View } from "react-native";
import { ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";
import { SUPPORT_CHANNELS } from "@/shared/support";

/**
 * Reachable at both /legal/privacy and /privacy — see app/privacy.tsx.
 *
 * Every claim here is meant to describe what the code actually does. Two in
 * particular are easy to get wrong by writing the expected boilerplate instead
 * of the truth: we hold no payment card details (no processor is integrated),
 * and connected-platform tokens are encrypted at rest rather than merely
 * "stored securely". If either of those changes, this page changes with it.
 */
const LAST_UPDATED = "10 September 2026";

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>{children}</Text>;
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: brand.text, fontWeight: "700" }}>{children}</Text>;
}

export default function PrivacyPolicyScreen() {
  const { email } = SUPPORT_CHANNELS;

  return <ScreenShell title="Privacy Policy" eyebrow="Lumière House" subtitle={`Last updated: ${LAST_UPDATED}`}>
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Surface><Para>
        Lumière House (&quot;Lumière&quot;, &quot;we&quot;, &quot;us&quot;) provides marketing and client-retention software for
        independent beauty and wellness businesses — lash technicians, hair stylists, estheticians,
        nail artists, salon and medspa owners. This policy explains what we collect, why, who else
        sees it, and what you can require of us. It applies to the Lumière House web application
        and any account created through it.
      </Para></Surface>

      <SectionLabel>Information you give us</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para><Bold>Account details.</Bold> Your name, email address, and a password. Passwords are
        never stored in readable form — we keep only a one-way hash, so nobody at Lumière can see
        or recover your password.</Para>
        <Para><Bold>Business details.</Bold> Your business name, industry, location, goals, brand
        voice notes, and any offers or campaigns you set up.</Para>
        <Para><Bold>Client records.</Bold> Details you enter about your own customers so you can
        follow up with them — typically a name and contact details, plus notes and visit history
        you choose to add. You decide what goes in. See &quot;Your clients&apos; data&quot; below, because your
        responsibilities differ there.</Para>
        <Para><Bold>Content you create.</Bold> Drafts, scripts, captions and schedules you produce
        in the app, including the prompts you type into the Content Studio.</Para>
      </View></Surface>

      <SectionLabel>Information we collect automatically</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para><Bold>Session and security data.</Bold> A session identifier stored in a cookie to
        keep you signed in, plus request timestamps and IP-derived rate-limit counters used to stop
        abuse of sign-in and other sensitive endpoints.</Para>
        <Para><Bold>Product activity.</Bold> Records of actions taken in your workspace — content
        approved, connections made, imports run — so the app can show your own history and so we
        can investigate problems you report.</Para>
        <Para>We do not use advertising trackers, and we do not build advertising profiles.</Para>
      </View></Surface>

      <SectionLabel>Connected platforms</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          Connecting a platform is always something you start, through that platform&apos;s own
          authorization screen. Lumière requests the narrowest access the feature needs.
        </Para>
        <Para><Bold>TikTok.</Bold> If you connect a TikTok account, we request basic profile
        information only (<Text style={{ color: brand.muted }}>user.info.basic</Text>) — your open
        id, display name and avatar — so the app can show which account is connected. We do not
        read your videos, messages, followers or analytics, we do not post on your behalf, we do
        not use TikTok data for advertising, and we do not sell it or pass it to third parties for
        their own purposes.
        </Para>
        <Para><Bold>YouTube.</Bold> The trend research feature queries publicly available YouTube
        search results through the YouTube Data API. It reads public data only and does not require
        or use a YouTube account of yours.</Para>
        <Para><Bold>Access tokens.</Bold> The access token a platform issues is encrypted at rest
        (AES-256-GCM) and is never sent to your browser. Disconnecting deletes our copy and asks
        the platform to revoke it. You can also revoke Lumière&apos;s access at any time from the
        platform&apos;s own settings, which takes effect regardless of anything you do here.</Para>
      </View></Surface>

      <SectionLabel>Service providers</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          We use a small number of providers to run the service. They process data on our
          instructions only, and each sees only what its job requires:
        </Para>
        <Para>• <Bold>Vercel</Bold> — application hosting.{"\n"}
        • <Bold>Aiven</Bold> — managed MySQL database hosting.{"\n"}
        • <Bold>Resend</Bold> — sending transactional email such as address verification and
        password resets.{"\n"}
        • <Bold>Anthropic / Amazon Web Services</Bold> — generating drafts in the Content Studio
        and answering support questions. Prompts you submit are sent to the model provider to
        produce a response.{"\n"}
        • <Bold>Telegram</Bold> — operating the optional support bot, if you choose to message it.{"\n"}
        • <Bold>Google</Bold> — YouTube Data API for public trend research.</Para>
        <Para>
          We do not sell personal information, and we do not share it for cross-context behavioural
          advertising.
        </Para>
      </View></Surface>

      <SectionLabel>Payments</SectionLabel>
      <Surface><Para>
        Lumière does not currently collect or store payment card details. Your workspace carries a
        plan record (for example &quot;starter&quot;) used to determine which features are available. If and
        when paid plans are introduced, payment will be handled by a specialist payment processor
        that receives card details directly, and this policy will be updated before that happens.
      </Para></Surface>

      <SectionLabel>Your clients&apos; data</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          The client records you enter are about other people. For that information you are the
          controller and Lumière is your processor: we hold and process it on your instructions, to
          provide the service to you.
        </Para>
        <Para>
          You are responsible for having a lawful basis to enter someone&apos;s details, for telling
          them how their information is used where that is required, and for honouring any request
          they make to you directly. Tools to export or delete that data are available to you in
          the app, and we will help if you need it.
        </Para>
      </View></Surface>

      <SectionLabel>How long we keep it</SectionLabel>
      <Surface><Para>
        Account and workspace data is kept while your account is open. Sign-in sessions expire
        after 30 days. Email verification and password reset links are single-use and short-lived.
        Rate-limit counters are transient. When you delete your account we remove your workspace
        data on the timeline described on the Data Deletion page; limited records may be retained
        where the law requires it.
      </Para></Surface>

      <SectionLabel>Security</SectionLabel>
      <Surface><Para>
        Traffic is encrypted in transit (HTTPS). Passwords are stored only as one-way hashes.
        Third-party access tokens are encrypted at rest. Session cookies are HTTP-only, so page
        scripts cannot read them. Sensitive endpoints are rate limited. No system is perfectly
        secure, and we will notify affected users and any required regulator if a breach occurs
        that presents a real risk.
      </Para></Surface>

      <SectionLabel>Your rights</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          Depending on where you live — including under the UK GDPR, EU GDPR and the CCPA — you may
          have the right to access the personal data we hold about you, correct it, delete it,
          obtain a portable copy, object to or restrict certain processing, and withdraw consent
          you have given.
        </Para>
        <Para>
          Exercise any of these by contacting us at the address below. We will respond within the
          period the applicable law requires, and within 30 days where no shorter period applies.
          We will not treat you differently for exercising a right. If you believe we have handled
          your data improperly you may also complain to your local data protection authority.
        </Para>
      </View></Surface>

      <SectionLabel>International transfers</SectionLabel>
      <Surface><Para>
        Our providers may process data in countries other than your own, including the United
        States. Where data leaves the UK or EEA we rely on the transfer safeguards those providers
        offer, such as standard contractual clauses.
      </Para></Surface>

      <SectionLabel>Children</SectionLabel>
      <Surface><Para>
        Lumière is a business tool and is not directed at children. We do not knowingly collect
        personal information from anyone under 16. If you believe a child has provided us with
        information, contact us and we will delete it.
      </Para></Surface>

      <SectionLabel>Changes to this policy</SectionLabel>
      <Surface><Para>
        We may update this policy as the product changes. The date at the top of this page always
        reflects the current version, and we will tell you about material changes before they take
        effect.
      </Para></Surface>

      <SectionLabel>Contact</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>Questions, or to exercise any right above:</Para>
        <Text style={{ color: brand.text, fontSize: 15, fontWeight: "700" }}>{email}</Text>
        <Para>
          Live chat options, where available, are listed on our{" "}
          <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/support")}>Support</Text>{" "}
          page. To delete your account and data, see{" "}
          <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/data-deletion")}>Data Deletion</Text>.
        </Para>
      </View></Surface>
    </ScrollView>
  </ScreenShell>;
}
