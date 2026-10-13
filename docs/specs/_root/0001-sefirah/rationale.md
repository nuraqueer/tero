# Sefirah migration reasoning

## Context

The app is early development. Device keys, vaults, invitations, and Help boards exist, but membership and most application state currently depend on one Cloudflare registry. That differs from the founder's intended Q2Q network and cannot be repaired by adding encryption labels to the interface.

## Options considered

1. Keep the registry and improve it in place. This preserves working flows but cannot provide independent network operation.
2. Add independent delivery and governance alongside existing flows, then migrate. This preserves the UI and makes each failure behavior testable, but requires an explicit transitional period.
3. Replace all existing backend and device logic at once. This could remove central assumptions sooner, but combines unvalidated native transport, governance, media, and migration risks in one change.

## Rationale

Choose option two. Validate immutable encrypted delivery first, native primary connectivity next, and separately resolve the authority protocol. A free budget is an operational limit, not a reason to invent cryptography or silently weaken availability. The experiment has explicit small limits and no app callers while real retention remains undecided.

Use private verifiable records rather than a public blockchain. Membership and referral relationships are sensitive; public consensus does not solve private discovery or media routing. Existing Ed25519 and XChaCha20 Poly1305 helpers supply signing and encryption without adding new primitives. MLS remains the separate intended chat and group key mechanism, not a generic transport or governance protocol.

## Operational limits

Cloudflare can see authenticated uploader identity and connection metadata even when content and embedded signatures are encrypted. SHA256 locators verify bytes, not permission. A random content key shared in a test does not establish production group membership. Real native transport and audio need device tests before privacy or quality claims.

The fallback is not free at unlimited scale. Application byte quotas do not cap every account request or storage overhead. Cloudflare Free limits, existing workloads, abuse controls, and fallback audio all require a measured capacity budget before rollout. Paid infrastructure is not assumed.
