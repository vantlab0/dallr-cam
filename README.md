# Dallr Studio

A desktop-first Decart Lucy 2.5 camera-transformation studio.
Built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, the official
`@decartai/sdk`, and a Tauri 2 shell.

> **Preview build.** Live camera transformation is connected through Decart Lucy 2.5 when a token
> service is configured. Real authentication, real payments and production account services activate
> when the hosted configuration is present; otherwise the local demo workspace is used. All people,
> balances, sample sessions and ledger entries are fictional.

---

## What works

- **Live Studio**: real local camera capture via `getUserMedia`, device selection, local mirror
  preview, split/output layouts, editable prompt with autosave, six prompt presets,
  reference-image upload (PNG/JPEG/WebP, 8 MB limit), session timer, start/stop and recovery.
- **Lucy 2.5 sessions**: the official `@decartai/sdk` opens a WebRTC session through a dedicated
  session service. Camera access is requested only when **Start session** is pressed.
- **Live updates**: prompt changes and reference images are sent to the running session with
  `realtime.set()`. The service reuses the uploaded reference ID instead of re-uploading the file
  for every prompt edit.
- **Credential handling**: the browser asks an application backend for a short-lived Decart client
  token. The permanent `DECART_API_KEY` stays on the server. The local Vite dev server provides a
  token endpoint so the frontend never contains the key; hosted builds point `VITE_DECART_TOKEN_ENDPOINT`
  at the production token service.
- **Production auth**: Supabase auth is required in production builds and real credentials are
  verified through the hosted Supabase project; the local demo identity is a development-only fallback.
- **Production billing**: top-ups run through the real Paystack gateway when `VITE_PAYSTACK_PUBLIC_KEY`
  is configured; the simulated checkout is a development-only fallback.
- **Session lifecycle**: connecting, connected, reconnecting, failed and stopped states; automatic
  SDK reconnects; clear provider/camera/credential errors; cleanup on stop, navigation away, page
  hide and app close.
- **Session history**: search, status filters, live/dry-run filters, totals, record drawer,
  copyable ID, CSV export and “use these settings” back into the studio. Live sessions store
  metadata only and always record **0 wallet credits**.
- **Wallet**: credit balance, USD estimate and usage projections; top-ups via the real Paystack
  gateway in production (or the simulated checkout in development) with a $20 / 1,000-credit minimum.
- **Transactions**: filters, search, CSV export, row detail modal and a retryable error state.
- **Account**: real Supabase auth in production builds, local demo identity in development.
- **Settings**: accent (Aurora, Citrine, Rose), reduced motion, compact density, camera defaults,
  demo usage rate, notification preferences, JSON export and demo-data reset (development only).
- **Preview states**: loading skeletons, empty states, retryable errors, offline banner,
  simulated offline / data-error switches and reconnect handling.
- **Responsive shell**: sidebar navigation, mobile drawer, sticky top bar and protected routes.

## Intentionally not implemented

| Area | Status |
| --- | --- |
| Decart Lucy 2.5 inference | Connected through the official SDK when credentials are configured |
| Virtual camera driver | Not installed; setup notes only |
| Wallet deductions for live sessions | Not implemented; live records use 0 credits |
| Desktop notifications | Preferences saved; delivery not wired |
| Video, audio or image persistence | Not recorded by Dallr; reference images are uploaded for inference and deleted |
| Light theme | Not bundled; the interface is dark-only |

Decart receives camera frames and reference images while a session is connected. Dallr does not
record, persist or transmit them anywhere else.

---

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript 5.8 (strict) |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 + custom CSS tokens |
| Motion | Framer Motion 12 (respects reduced motion) |
| Routing | React Router 7 with `HashRouter` (safe for the packaged webview) |
| Icons | Lucide React |
| Realtime | `@decartai/sdk` 0.2.12 (Lucy 2.5 / WebRTC / LiveKit) |
| Desktop | Tauri 2 (Rust shell, WebView2 / WKWebView / WebKitGTK) |
| Tests | Vitest + Testing Library + jsdom |

Typography: Instrument Serif for the wordmark, Inter Variable for the interface.

---

## Quick start

Requirements:

- Node.js 20+ (verified here on Node 24)
- pnpm 10+ (the repo pins `pnpm@12.5.1` through `packageManager`)
- A Decart API key with Lucy 2.5 access for live sessions

```bash
pnpm install
cp .env.example .env.local
# Add DECART_API_KEY to .env.local
pnpm dev
```

Open <http://localhost:1420>. The app starts in the demo workspace and boots into Live Studio.

Demo credentials (prefilled on the sign-in screen after signing out):

```text
ada@dallr.studio
dallr-demo
```

Any valid-looking email and a 6+ character password will also sign in; registration accepts any
name, valid email, 8+ character password and the demo acknowledgement checkbox. These local demo
fallbacks only apply when no hosted Supabase configuration is present (development mode).

## Decart session setup

### Local development

`.env.local`:

```dotenv
DECART_API_KEY=your_server_side_key
```

The Vite dev server exposes `POST /api/realtime-token`. The endpoint:

- reads `DECART_API_KEY` in Node, never in the browser bundle;
- mints a 300-second client token restricted to `lucy-2.5`;
- returns `{ "apiKey": "...", "expiresAt": "..." }`;
- is rate-limited to 12 requests per minute per client;
- is registered only by `pnpm dev` (`apply: 'serve'`).

The frontend calls this endpoint through `apiKeyProvider`, so the SDK can fetch a fresh token for
the initial connect, uploads and reconnects. Restart the dev server after changing
`DECART_API_KEY`.

### Hosted backend / packaged builds

A packaged Tauri build does not run the Vite dev middleware. Set a public endpoint at build time:

```dotenv
VITE_DECART_TOKEN_ENDPOINT=https://your-service.example.com/decart/session-token
```

The endpoint must accept `POST`, allow the app origin (CORS), and return JSON shaped like:

```json
{
  "apiKey": "<short-lived Decart client token>"
}
```

#### Production token service

`server/` contains a minimal production token service (Node HTTP, no extra runtime dependencies)
that implements the same contract as the Vite dev middleware:

- `server/index.ts` — HTTP entry point (listens on `PORT`, default `8787`).
- `server/decart-token.ts` — token issuance logic, CORS handling and rate limiting.

```bash
pnpm server
```

The service:

- reads `DECART_API_KEY` from the server environment, never from the client bundle;
- mints a 300-second client token restricted to `lucy-2.5`;
- returns `{ "apiKey": "...", "expiresAt": "..." }`;
- allows the Tauri app origins (`tauri://localhost`, `http://tauri.localhost`) and web origins
  configured via `ALLOWED_ORIGINS`;
- rate-limits to 12 token requests per minute per client IP (returns `429` when exceeded).

Recommended production controls:

- keep the permanent Decart key in a server-side secret store;
- authenticate the Dallr user before minting a token;
- restrict `allowedModels` to `lucy-2.5` and set a short `expiresIn`;
- restrict `allowedOrigins` to the packaged app and web origins;
- rate-limit per user/IP and log failures without logging tokens.

`VITE_DECART_TOKEN_ENDPOINT` is public configuration, not a secret. Never prefix the Decart API key
with `VITE_`.

#### Build-time environment variables

The GitHub Actions release workflow injects the hosted configuration into the frontend bundle at build
time via repository variables and secrets:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_DECART_TOKEN_ENDPOINT` | Repository variable | Public URL of the production token service |
| `VITE_SUPABASE_URL` | Repository variable | Hosted Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY` | Repository secret | Hosted Supabase anon/publishable key |
| `VITE_SUPABASE_JWKS_URL` | Repository variable | Supabase JWKS URL |
| `VITE_PAYSTACK_PUBLIC_KEY` | Repository secret | Paystack public key (real checkout) |
| `PAYSTACK_SECRET_KEY` | Repository secret | Paystack secret key (server-side only) |
| `SUPABASE_SECRET_KEY` | Repository secret | Supabase service role key (server-side only) |
| `DECART_API_KEY` | Repository secret | Permanent Decart key (token service only, never bundled) |

When these are present, the packaged app signs users in with real Supabase accounts, accepts real
Paystack top-ups and mints real Decart Lucy tokens. When they are absent, the app falls back to the
local demo workspace (development mode only).

### What happens on Start

1. The studio validates the prompt and requests camera access.
2. The SDK dynamically loads (the WebRTC chunk is not in the initial bundle).
3. The token service mints a short-lived client token.
4. A reference image, if present, is uploaded once and its reusable file ID is stored.
5. `client.realtime.connect()` opens the Lucy 2.5 stream at the model's 1280 × 720 / 30 fps target.
6. Prompt edits and reference changes are applied live with `realtime.set()`.
7. Stop, navigation away, page hide or app close disconnects, stops both media streams, deletes the
   uploaded reference and clears the session.

The local preview may be mirrored. The remote Lucy output is never mirrored a second time.
`mirror: "auto"` is used when the browser reports a facing mode; desktop webcams usually do not, so
the service falls back to `mirror: true` when the user has mirroring enabled.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server on port 1420, including the dev token endpoint |
| `pnpm build` | Type-check and create a production build in `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm typecheck` | Run `tsc --noEmit` |
| `pnpm lint` | Run ESLint over the repo |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm tauri dev` | Run the Tauri desktop shell against the dev server |
| `pnpm tauri build` | Build and bundle the native desktop app |
| `pnpm server` | Run the production Decart token service locally |

## Desktop build

The Tauri shell is scaffolded in `src-tauri/`. Native builds require:

- Rust stable 1.77.2 or newer (`rustup`, `cargo`, `rustc`)
- **Windows**: Visual Studio Build Tools with the MSVC C++ workload and Windows SDK, plus
  WebView2 (preinstalled on Windows 11)
- **macOS**: Xcode Command Line Tools; macOS 10.15+
- **Linux**: the Tauri 2 system dependencies for WebKitGTK and GTK 3

Then:

```bash
pnpm tauri dev
pnpm tauri build
```

Installer formats follow Tauri defaults (`nsis` / `msi` on Windows, `app` / `dmg` on macOS,
`deb` / `rpm` / `appimage` on Linux).

The Tauri CSP allows Decart and LiveKit WebSocket/HTTPS traffic, the hosted token service origin and
Supabase/Paystack origins, plus blob-backed WebRTC workers. If you use a hosted token endpoint on a
different origin, add that origin to `connect-src` in `src-tauri/tauri.conf.json`.

### Camera permissions

- **macOS**: `src-tauri/Info.plist` declares `NSCameraUsageDescription`. Tauri merges this file
  into the generated bundle `Info.plist`. A signed and notarized distribution build may still need
  the matching camera entitlement; the shell here is unsigned.
- **Windows**: the WebView2 camera prompt is backed by Windows privacy settings. If the camera is
  blocked, enable it under **Settings → Privacy & security → Camera**.
- **Linux**: WebKitGTK camera access may require the GStreamer media plugins; packaged AppImages
  can be built with `bundleMediaFramework` if the camera is unavailable.
- **Browser preview**: `localhost` is treated as a secure context, so `getUserMedia` works without
  HTTPS. Permission is requested only after **Start session** is pressed.

The native build was **not executed in this environment** because `cargo` and `rustc` are not
installed. The frontend type-check, lint, tests and production build all pass.

---

## Mock data and local storage

All sample records live in `src/lib/mock-data.ts` and are labelled throughout the interface. They
describe the development/demo workspace only; production builds with hosted configuration use the
real account, wallet and ledger data.

Demo identity and balances:

- User: **Ada Okafor**, `ada@dallr.studio`, Studio preview plan
- Wallet: **4,820 credits** (≈ $96.40 at $0.02 per credit)
- Minimum top-up: **$20 = 1,000 credits**
- Mock FX: **₦1,650 per $1** (indicative only)
- Five sample sessions and eleven sample ledger entries

Persisted locally:

| Key | Contents |
| --- | --- |
| `dallr:state:v1` | Demo user, wallet, settings, sessions, transactions and studio draft |
| `dallr:camera:v1` | Last selected camera device ID (only when “Remember last camera” is on) |

Reference images are held in memory, previewed from an object URL that is revoked when the image is
removed or the page closes, and uploaded to Decart for the duration of a session. Dallr does not
retain them. Uploaded files are deleted when the session stops; the provider TTL is one hour if the
app closes abruptly.

Live session records contain metadata only: title, prompt, preset, camera label, reference filename,
timing and status. They are labelled **Live session** in history and always record **0 wallet
credits** because billing is not connected.

Use **Settings → Data & about → Reset demo data** to restore the initial sample workspace, or
**Export JSON** to download a copy of the local state. Nothing is synced to a Dallr account service.
This action is development-only and is ignored in production builds.

## Project structure

```text
src/
  components/
    auth/        password field
    layout/      app shell, sidebar, topbar, auth layout, boot screen
    studio/      camera/output previews, prompt, reference, presets, session bar
    ui/          buttons, cards, forms, overlays, feedback, badges, stats
  hooks/         Lucy session controller, camera devices, simulated data loading
  lib/           credits, formatting, storage, mock data, downloads, clipboard
  routes/        studio, sessions, wallet, transactions, profile, settings, auth
  services/
    decart/      credential provider, session service, typed errors
  state/         app state, persistence, toasts
  test/          Vitest setup
  types/         shared typed models
src-tauri/
  src/           Rust entry point
  capabilities/  Tauri ACL (core permissions only)
  icons/         generated bundle icons
  Info.plist     macOS camera usage description
  tauri.conf.json
vite/
  decart-token-plugin.ts   development-only token endpoint
server/
  index.ts       production token service entry point
  decart-token.ts  token minting, CORS and rate limiting
```

## Verification

Run on Windows with Node 24 / pnpm 12.5.1:

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | 6 files, 34 tests passed |
| `pnpm build` | Pass |

The build splits framework, motion and icon code into separate chunks. The Decart/LiveKit WebRTC
chunk is loaded only when a session starts. Manual browser review covered the token endpoint's
missing-key response, the full start path with a synthetic camera, credential failure recovery,
camera-track release, the integration-notes modal, session-history live filters and the updated
studio states.

## Known limitations

- A live end-to-end Lucy session requires a valid `DECART_API_KEY`; none was available while this
  build was verified. Credential failure, camera release and cleanup paths were exercised with a
  synthetic camera and the real SDK.
- No native desktop binary was produced or smoke-tested here (Rust toolchain missing).
- macOS camera permission is configured but untested on macOS hardware; code signing and
  notarization are not set up.
- The Vite dev token endpoint is development-only; production builds use the hosted token service
  in `server/` (set `VITE_DECART_TOKEN_ENDPOINT`).
- The Tauri CSP includes the production Supabase/Paystack/token-service origins; re-check before
  changing the token service domain.
- Authentication, billing, notifications and data loading are simulated with deliberate delays unless
  the hosted configuration (Supabase / Paystack / Decart token service) is provided.
- The ledger is illustrative and is not reconciled against the sample wallet balance.
- The virtual-camera driver is not implemented; output is preview-only.
- No end-to-end browser automation is committed; verification was manual plus focused unit tests.
- Decart and Lucy are referenced descriptively to frame the integration. This project is not
  affiliated with Decart.
