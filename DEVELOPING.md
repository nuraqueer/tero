# Developing Tero

You need [Bun](https://bun.sh) 1.3 or later.

```sh
bun install          # install everything
bun run check        # formatting, types and tests, the same as CI
```

| Folder | What it is | Run it |
|---|---|---|
| `apps/app` | The Expo app: iOS, Android and the web | `cd apps/app && bunx expo start` |
| `apps/edge` | The Cloudflare Worker at tero.pherus.org | `cd apps/edge && bun run dev` |
| `packages/crypto` | Recovery phrase, keys, signing and the passcode vault | |
| `packages/protocol` | Messages and API shapes shared by the app and the Worker | |
| `packages/ui` | Colours, fonts and sizes from the design | |
| `packages/i18n` | English, Kiswahili, 中文 and Français | |

To try the web version as it will be served: `cd apps/app && bunx expo export --platform web`,
then `cd apps/edge && cp .dev.vars.example .dev.vars && bun run dev`. The Worker needs
`AUTH_SECRET` (32 characters or more) to sign people in; in production set it with
`bunx wrangler secret put AUTH_SECRET`.

The phone apps talk to `https://tero.pherus.org`. To point them at another Worker, set
`EXPO_PUBLIC_API_URL`.

Add app packages with `bunx expo install <name>` so the versions match the Expo SDK.

## Cryptography

All cryptography comes from the audited `@noble` and `@scure` libraries; `packages/crypto`
only wires them together. Don't add new primitives there without a review.

## Translations

Every message lives in `packages/i18n/src/locales`. English is the source; the tests fail if
another language is missing a message or changes a `{placeholder}`. The current Kiswahili,
Chinese and French text was written as a starting point and needs review by native speakers.

Before contributing, read the [contributor agreement](CLA.md).
