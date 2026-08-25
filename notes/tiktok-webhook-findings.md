# External verification notes

## Official TikTok documentation

- Overview: https://developers.tiktok.com/doc/webhooks-overview/
  - TikTok webhooks deliver HTTPS POST JSON notifications to a registered callback URL.
  - The callback must immediately return HTTP 200 and must use HTTPS.
  - Delivery is at least once and may be retried for up to 72 hours, so consumers must make processing idempotent.

- Signature verification: https://developers.tiktok.com/doc/webhooks-verification/
  - The `TikTok-Signature` header contains `t=<unix timestamp>,s=<hex signature>`.
  - The signed payload is `${timestamp}.${raw JSON body}`.
  - The signature is an HMAC-SHA256 generated with the TikTok client secret.
  - Consumers should reject signatures whose timestamps are outside an acceptable age window to reduce replay risk.

These findings support the implemented provider-specific verifier, durable webhook receipt uniqueness constraint, and 72-hour receipt retention window. No webhook behavior is implemented for providers that are not configured.
