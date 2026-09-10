import { Linking, ScrollView, Text, View } from "react-native";
import { ScreenShell, SectionLabel, Surface, brand } from "@/components/lumiere-ui";
import { SUPPORT_CHANNELS } from "@/shared/support";

/**
 * Reachable at both /legal/terms and /terms — see app/terms.tsx.
 *
 * Kept honest about what the product currently does. It does not publish to
 * connected platforms and it does not take payment; saying otherwise here
 * would be a promise the code does not keep.
 */
const LAST_UPDATED = "10 September 2026";

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: brand.text, fontSize: 14, lineHeight: 21 }}>{children}</Text>;
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: brand.text, fontWeight: "700" }}>{children}</Text>;
}

export default function TermsOfServiceScreen() {
  const { email } = SUPPORT_CHANNELS;

  return <ScreenShell title="Terms of Service" eyebrow="Lumière House" subtitle={`Last updated: ${LAST_UPDATED}`}>
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Surface><Para>
        These terms are an agreement between you and Lumière House (&quot;Lumière&quot;, &quot;we&quot;, &quot;us&quot;)
        covering your use of the Lumière House application and services (the &quot;Service&quot;). By
        creating an account or using the Service you accept them. If you are accepting on behalf of
        a business, you confirm you are authorised to bind that business.
      </Para></Surface>

      <SectionLabel>What the Service does</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          Lumière helps independent beauty and wellness businesses set goals, keep client records,
          plan and draft marketing content, research public trends, and review performance.
        </Para>
        <Para>
          Lumière does not publish to your connected accounts. Content is drafted for you to review
          and post yourself. If that ever changes, it will require an explicit, separate
          authorization from you first.
        </Para>
      </View></Surface>

      <SectionLabel>Your account</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          You must be at least 18 and provide accurate registration details. You are responsible
          for keeping your password secure and for everything done through your account. Tell us
          promptly if you suspect unauthorised access.
        </Para>
        <Para>
          Some features require a confirmed email address. We may need to verify your address
          before enabling actions that cost money to run or that reach outside the product.
        </Para>
      </View></Surface>

      <SectionLabel>Acceptable use</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>You agree not to:</Para>
        <Para>• break the law, or infringe anyone&apos;s intellectual property or privacy;{"\n"}
        • upload another person&apos;s details without a lawful basis to do so;{"\n"}
        • use the Service to send spam or unsolicited marketing;{"\n"}
        • generate content that is deceptive, defamatory, hateful, or that makes medical claims you
        cannot substantiate;{"\n"}
        • probe, scrape, overload, or attempt to circumvent security or rate limits;{"\n"}
        • resell or white-label the Service without our written agreement;{"\n"}
        • breach the terms of any platform you connect.</Para>
      </View></Surface>

      <SectionLabel>Connected accounts</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          Connecting a third-party account such as TikTok is optional and initiated by you through
          that platform&apos;s authorization screen. Your use of each platform remains governed by that
          platform&apos;s own terms, and you are responsible for complying with them.
        </Para>
        <Para>
          You can disconnect at any time from the Connect screen, which deletes the access token we
          hold and asks the platform to revoke it. A platform may change or withdraw its API at any
          time, which can suspend a feature through no fault of either of us.
        </Para>
      </View></Surface>

      <SectionLabel>AI-generated content</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          The Content Studio produces drafts using automated systems. Output can be inaccurate,
          generic, or unsuitable, and similar prompts may produce similar results for other users.
        </Para>
        <Para>
          <Bold>You are responsible for reviewing anything before you publish it</Bold> — including
          checking claims, prices, and any statement about results. Do not present generated
          material as professional, medical, or legal advice.
        </Para>
      </View></Surface>

      <SectionLabel>Your content and data</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>
          You keep ownership of everything you put into the Service and of the drafts it produces
          for you. You grant us only the licence needed to host, process and display that material
          in order to run the Service for you.
        </Para>
        <Para>
          How we handle personal data is set out in our{" "}
          <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/privacy")}>Privacy Policy</Text>,
          which forms part of these terms.
        </Para>
      </View></Surface>

      <SectionLabel>Plans and payment</SectionLabel>
      <Surface><Para>
        The Service is currently provided without charge while in early access, and no payment
        card details are collected. If we introduce paid plans we will set out the price, billing
        period and cancellation terms clearly, and you will have to agree to them before being
        charged. Nothing here obliges you to pay for anything you have not agreed to.
      </Para></Surface>

      <SectionLabel>Availability and changes</SectionLabel>
      <Surface><Para>
        We aim to keep the Service running but do not guarantee uninterrupted availability.
        Maintenance, provider outages and upstream API changes can interrupt it. We may add,
        change or remove features; where a change materially reduces what you rely on, we will
        give reasonable notice.
      </Para></Surface>

      <SectionLabel>Suspension and termination</SectionLabel>
      <Surface><Para>
        You may stop using the Service and delete your account at any time — see{" "}
        <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/data-deletion")}>Data Deletion</Text>.
        We may suspend or terminate an account that breaches these terms, that puts the Service or
        other users at risk, or where we are required to by a platform or by law. Where
        circumstances reasonably allow, we will tell you first and give you a chance to put things
        right.
      </Para></Surface>

      <SectionLabel>Disclaimers</SectionLabel>
      <Surface><Para>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind to the
        fullest extent the law allows. Forecasts, scores and recommendations shown in the app are
        directional aids, <Bold>not guarantees of bookings, revenue or any business outcome</Bold>.
      </Para></Surface>

      <SectionLabel>Liability</SectionLabel>
      <Surface><Para>
        To the extent permitted by law, we are not liable for indirect or consequential loss, or
        for lost profits, revenue, goodwill or data. Our total liability arising from the Service
        is limited to the greater of the amount you paid us in the twelve months before the claim,
        or £100. Nothing here excludes liability that cannot lawfully be excluded — including for
        death or personal injury caused by negligence, or for fraud.
      </Para></Surface>

      <SectionLabel>Indemnity</SectionLabel>
      <Surface><Para>
        You agree to cover us for claims arising from your misuse of the Service, from content you
        publish, or from your handling of your own clients&apos; personal data in breach of these terms
        or of applicable law.
      </Para></Surface>

      <SectionLabel>Governing law</SectionLabel>
      <Surface><Para>
        These terms are governed by the laws of England and Wales, and the courts of England and
        Wales have exclusive jurisdiction. If you are a consumer, this does not remove protections
        you have under the mandatory law of the country where you live.
      </Para></Surface>

      <SectionLabel>Changes to these terms</SectionLabel>
      <Surface><Para>
        We may update these terms as the Service develops. The date at the top of this page
        reflects the current version. We will give notice of material changes, and continued use
        after they take effect means you accept them.
      </Para></Surface>

      <SectionLabel>Contact</SectionLabel>
      <Surface><View style={{ gap: 8 }}>
        <Para>Questions about these terms:</Para>
        <Text style={{ color: brand.text, fontSize: 15, fontWeight: "700" }}>{email}</Text>
        <Para>
          Other ways to reach us are on our{" "}
          <Text style={{ color: brand.text, fontWeight: "700" }} onPress={() => Linking.openURL("/legal/support")}>Support</Text>{" "}
          page.
        </Para>
      </View></Surface>
    </ScrollView>
  </ScreenShell>;
}
