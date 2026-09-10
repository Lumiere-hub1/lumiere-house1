/**
 * /privacy — the canonical URL given to third-party reviewers (TikTok's
 * developer dashboard among them), which expect a policy at the site root.
 *
 * A re-export rather than a copy: the page exists once, at
 * app/legal/privacy.tsx, so the two URLs can never drift apart and say
 * different things about how data is handled.
 */
export { default } from "./legal/privacy";
