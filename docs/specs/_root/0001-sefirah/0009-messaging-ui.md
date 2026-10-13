# 0009 · Messaging interface and contact access

Status: in progress, interface and local-state integration.
Date: 2026-10-13.

Use the agreed Hino design: compact contact rows, shared icons and typography,
calm glass materials, iMessage-inspired conversation layout. Messages lists real
accepted contacts with search and pull refresh. Accepted Circles rows open the
same chat route; own profile still opens Yoru. Do not fabricate chat previews,
online status, sent receipts or incoming messages.

The shared directory provider lives around the unlocked stack, keyed to account
identity, so chat routes can resolve names and handles without leaking state
through lock or account replacement. Opening a chat rechecks accepted contact
status through the authenticated API. Repeat that check on focus and foreground.
A cancelled check must not open a native engine. Close the engine on blur.

The conversation header uses the real display name, handle and existing card
avatar. Show local native inbox entries only after the access check. The composer
supports multiline typing, a bounded draft and keyboard avoidance; drafts stay
in memory and clear on leaving the screen or locking. Sending remains disabled
until actual peer handshake/delivery is implemented. Do not encrypt and enqueue
undeliverable text as if it was sent. iPhone Expo Go can preview the interface,
but must clearly show unavailable native messaging.

Remove fabricated skeleton conversation and keep/screenshot claims from the chat
screen. State the agreed retention direction, 24 hours after both read or seven
days unread, without claiming it is enforced in this interface slice. Add loading,
empty, access-denied, unavailable and error states. No native rebuild is needed.
Verify app types, changed-file lint and focused contact-access checks only.
