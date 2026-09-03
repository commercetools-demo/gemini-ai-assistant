# Features

Code-derived inventory of what this repo implements. Bullets and key file paths —
the mechanism lives in `docs/how-it-works.md`, the walkthrough in `docs/demo-script.md`.

_Last generated: 2026-09-02 by feature-doc._

This repo is built from scratch (not a fork of any commercetools starter). It ships two
independently-deployable pieces: a commercetools Connect **service** (`/service`) that
brokers between commercetools and Google's Gemini Live API, and a pair of publishable npm
React packages (`/shared/packages/*`) that any storefront can drop in to get a voice-driven
AI shopping assistant. Since there is no starter base, no per-bullet provenance tags apply.

## Connect service (`/service`)

- Express app exposing the assistant API under `/service`, deployable as a commercetools
  Connect `service` application declared in `connect.yaml` (`service/src/app.ts`)
- Origin allow-list CORS: extracts the registrable domain from the request's `Origin`
  header (handling both real domains and `localhost[:port]`) and checks it against the
  comma-separated `CORS_ALLOWED_ORIGINS` env var before allowing the request
  (`service/src/utils/domain.ts`, wired in `service/src/app.ts`)
- Central error middleware distinguishes `CustomError` (structured status/message/errors,
  stack only in development) from unexpected errors (generic 500)
  (`service/src/middleware/error.middleware.ts`, `service/src/errors/custom.error.ts`)
- `GET /service/health-check` — liveness probe returning status, uptime and a static
  version, used by the frontend button to hide itself until the backend is reachable
  (`service/src/controllers/ai-agent.controller.ts`)
- `GET /service/get-ai-agent-properties` — exposes the configured `AI_MODEL` and `AI_VOICE`
  to the frontend so it can drive the Gemini Live connection
- `GET /service/get-sdk-tools` — returns the commercetools tool set (see below) converted
  into Gemini `FunctionDeclaration`s, scoped by an optional `MCPContext` (customerId,
  cartId, storeKey, businessUnitKey) passed as query params
- `GET /service/get-ephemeral-token` — mints a single-use, time-boxed Gemini Live
  `AuthToken` (30 min expiry, 1 min new-session window) server-side so the browser never
  sees the real `GOOGLE_AI_API_KEY`, pre-loading it with the full tool list (SDK tools +
  `FRONTEND_TOOLS`) and audio response modality (`service/src/utils/ai-agent.utils.ts`)
- `POST /service/call-sdk-tool` — executes a named commercetools tool server-side with the
  arguments the model chose, with a special case normalizing `search_products` calls to
  always pass a `productProjectionParameters` object (`service/src/utils/ai-agent.utils.ts`)

### commercetools tool integration

- Wraps `@commercetools/agent-essentials`'s LangChain toolkit, authenticated via client
  credentials (`CTP_CLIENT_ID`/`CTP_CLIENT_SECRET`/`CTP_PROJECT_KEY`/region-derived auth and
  API URLs), to expose commercetools operations as callable tools
  (`service/src/utils/ai-agent.utils.ts`)
- The exposed action surface is configurable per deployment via the `AVAILABLE_TOOLS` env
  var (JSON); the documented default enables **product search** (read), **category**
  (read) and **cart** (create/read/update) — configurable per-connector instance without a
  code change (`connect.yaml`, `README.md`)
- Converts each toolkit tool's Zod schema into Gemini's `FunctionDeclaration` /
  `Type`-based JSON schema (strings, numbers, booleans, arrays, nested objects, enums,
  min/max, required fields), including a fallback that wraps non-object schemas as a
  single `input` parameter (`service/src/utils/tools.ts`)
- Tolerant JSON parsing for env-supplied configuration (`AVAILABLE_TOOLS`,
  `FRONTEND_TOOLS`): tries a plain `JSON.parse`, then retries after unescaping a
  double-encoded string, and falls back to an empty object while logging on failure
  (`service/src/utils/parse-actions.ts`)
- `FRONTEND_TOOLS` env var lets a deployment inject extra tool *declarations* (matching
  `@google/genai`'s `FunctionDeclaration` shape) that the model can call but that are
  actually executed client-side, not against commercetools (`connect.yaml`, provider
  `frontend-types.ts`)

## React integration packages (`/shared/packages`)

- `@commercetools-demo/gemini-ai-assistant-provider` — headless React provider/hooks layer
  that owns the Gemini Live connection, token lifecycle, tool wiring and audio pipeline
  (`shared/packages/gemini-ai-assistant-provider`)
- `@commercetools-demo/gemini-ai-assistant-button` — drop-in floating UI (mic button,
  connect toggle, audio-level pulse) built on top of the provider
  (`shared/packages/gemini-ai-assistant-button`)
- `GeminiAIAssistant` wrapper component composes `LiveAPIProvider` + `ControlTray` behind a
  single `baseUrl` / `frontEndTools` / `systemInstruction` / `context` prop surface for
  one-line integration into any React storefront (`.../gemini-ai-assistant-button/src/components/wrapper/index.tsx`)
- `useLiveAPI` hook: fetches an ephemeral token and the SDK tool list on mount (via SWR,
  revalidate-on-focus disabled), assembles the Gemini `LiveConnectConfig` (tools, voice,
  system instruction), and exposes `connect`/`disconnect`/`callSDKTool`/`callFrontendTool`/
  `healthCheck` to the rest of the tree
  (`shared/packages/gemini-ai-assistant-provider/src/use-live-api/index.ts`)
- `GenAILiveClient` — event-emitting wrapper around `@google/genai`'s Live websocket
  session; separates audio frames out of model turns, surfaces `toolcall`,
  `toolcallcancellation`, `interrupted`, input/output transcription and `turncomplete`
  events (`shared/packages/gemini-ai-assistant-provider/src/utils/genai-live-client.ts`)
- Browser mic capture via an `AudioWorklet`-based `AudioRecorder` that streams base64 PCM16
  chunks (16kHz) up to Gemini and reports live input volume for the UI's pulse animation
  (`shared/packages/gemini-ai-assistant-provider/src/utils/audio-recorder.ts`)
- `AudioStreamer` plays PCM16 audio returned by the model back through the Web Audio API,
  with a `vumeter-out` worklet reporting output volume, and stops mid-playback when the
  model is interrupted (barge-in) (`.../utils/audio-streamer.ts`, wired in `use-live-api/index.ts`)
- Toolcall bridge: when Gemini requests a function call, `Toolcall` decides whether it is
  one of the fetched commercetools SDK tools (routed to the backend's
  `POST /call-sdk-tool`) or a caller-supplied frontend tool (executed locally via
  `callFrontendTool`), then returns the result(s) to the live session
  (`shared/packages/gemini-ai-assistant-button/src/components/toolcall/index.tsx`)
- Control tray UI: floating mic (mute toggle) + connect/disconnect toggle rendered as an
  animated sparkle-to-audio-pulse icon, an in/out volume-reactive pulse (`AudioPulse`), and
  auto-hides entirely until the backend health check reports `healthy`
  (`shared/packages/gemini-ai-assistant-button/src/components/control-tray/index.tsx`)
- Every control-tray visual is themed through CSS custom properties (`--control-tray-*`,
  `--audio-pulse-*`) with sensible defaults, so a host app can restyle the widget without
  forking it (`.../control-tray/index.tsx`, `.../audio-pulse/AudioPulse.tsx`)
- In-memory streaming logger (`LoggerProvider`/`useLoggerStore`) capturing connection,
  tool-call and transcription events with de-duplication (repeats collapse into a count)
  and a capped ring buffer, exposed to a `Logger`/`LogListener` component for debugging
  (`shared/packages/gemini-ai-assistant-provider/src/use-store-logger/index.ts`)
- `MCPContext` (customerId, cartId, storeKey, businessUnitKey) is threaded from the host
  app through every API call (token, tools, health check, tool execution) as query
  params, so the same assistant can be scoped to a specific customer/cart/store/business
  unit (`shared/packages/gemini-ai-assistant-provider/src/use-live-api/frontend-types.ts`)

## Shopping assistant behavior

- Default system instruction constrains the model to a commerce-assistant persona: only
  present products retrieved via the commercetools tools (no fabricated products), keep
  answers short, avoid salesy tone, and never retry a function call without user
  confirmation (`shared/packages/gemini-ai-assistant-provider/src/constants.ts`)
- The same system prompt embeds concrete commercetools Search query-language guidance for
  the model (e.g. `categoriesSubTree:"id"` instead of `categories.id=`, quoted `where`
  values, `key in (...)` syntax) so free-form voice requests translate into valid product
  search queries, and can be overridden per-integration via the `systemInstruction` prop
  (`shared/packages/gemini-ai-assistant-provider/src/constants.ts`)
- Voice conversation loop with server-side barge-in: user audio streams up continuously
  while connected, and the assistant's own audio playback is cut off immediately when the
  model reports it was interrupted (`control-tray/index.tsx`, `genai-live-client.ts`)
- Live input/output transcription is captured (though not yet surfaced in the default UI
  beyond the logger) alongside the audio stream (`genai-live-client.ts` `onmessage`)

## Demo tooling and setup

- `shared/publish-packages.sh` and `shared/update-package-versions.sh` script version
  bumps and npm publication of the two React packages as a matched pair
- `service/.env.example` enumerates every environment variable the service needs locally
  (CT client credentials/region/scope, `AI_MODEL`, `AI_VOICE`, `GOOGLE_AI_API_KEY`,
  `AVAILABLE_TOOLS`, `FRONTEND_TOOLS`, `CORS_ALLOWED_ORIGINS`)
- `shared/test-application` is a plain Create React App scaffold (`yarn start` in
  `/shared`) for exercising the button/provider packages outside a real storefront
- `service/tests/integration/routes.spec.ts` is stale: it imports `../../src/controllers/service.controller`
  and `../../src/utils/config.utils`, neither of which exists in the current
  `service/src` tree (the real controller is `ai-agent.controller.ts`, and there is no
  `config.utils.ts` outside its Jest `__mocks__` stub) — the suite does not exercise any
  of the routes documented above and would not run against this codebase as-is

## Distinctive feature

The distinctive thing this repo has that no starter has: a **voice-driven AI shopping
assistant with server-brokered, tool-scoped commercetools access** — the browser never
holds commercetools or Gemini credentials; it gets a single-use ephemeral Gemini token and
a pre-authorized, per-deployment-configurable set of commercetools tools (product search,
category browsing, cart create/read/update by default), and can additionally accept
storefront-defined "frontend tools" that the model can call but that execute entirely on
the client. Packaged as two standalone npm components, this is meant to be dropped into any
existing storefront rather than built as a one-off feature of a single demo.
