## Overview

This is a **Next.js (App Router)** web app that integrates with **SailPoint Identity Security Cloud (ISC)** using **NextAuth** (custom OAuth provider) and the official **`sailpoint-api-client`** SDK.

Core capabilities implemented in this conference demo:

- **Login** via ISC OAuth and session protection via NextAuth middleware
- **SOD policies** list and violated identity discovery
- **AI-assisted policy violation resolution** using the Vercel AI SDK, OpenAI, and the ISC Access Requests MCP endpoint

## Getting started (local development)

### Prerequisites

- Node.js (recommended: Node 18+)
- An ISC tenant and OAuth client credentials

### Install

```bash
npm install
```

### Configure environment variables

Create a local env file:

#### `.env.local` template

```bash
# --- NextAuth (recommended for local dev) ---
# The base URL your app runs on locally.
NEXTAUTH_URL=http://localhost:3000

# A random secret used to sign/encrypt session tokens.
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=replace_me_with_a_random_secret

# --- SailPoint Identity Security Cloud (ISC) OAuth (end-user login) ---
# Used for the OAuth authorization URL (browser redirect).
# Example (varies by tenant/region): https://<tenant>.identitynow.com
ISC_BASE_URL=https://<your-isc-tenant-host>

# Used for API calls (token exchange, userinfo, and all SDK calls).
# Example (varies by tenant/region): https://<tenant>.api.identitynow.com
ISC_BASE_API_URL=https://<your-isc-api-host>

# OAuth client used by NextAuth for user login + refresh token.
ISC_CLIENT_ID=replace_me
ISC_CLIENT_SECRET=replace_me

# --- (Optional) AI-assisted policy resolution ---
# Enables `resolvePolicyViolationWithAI` in `lib/actions/isc.ts`.
# Vercel AI Gateway key.
AI_GATEWAY_API_KEY=

# Optional model override.
# Default target when unset: gpt-5-mini (normalized to openai/gpt-5-mini via gateway).
POLICY_RESOLUTION_MODEL=
```

#### Configure your ISC OAuth app (redirect URI)

Because this app uses a custom NextAuth provider with id **`identitySecureCloud`**, your ISC OAuth client must allow this callback URL:

- `http://localhost:3000/api/auth/callback/identitySecureCloud`

For production, add the equivalent URL for your deployed domain.

Notes for ISC OAuth setup:

- This demo requests scope **`sp:scopes:all`** (see `app/api/auth/authOptions.ts`). Ensure your ISC OAuth client is allowed to request the required scopes for the APIs you want to use.
- The refresh-token flow is used when the access token expires. Ensure your OAuth client is configured to issue refresh tokens (if your tenant settings require it).

Reference document:

- [Next-Auth (Auth.js) integration with ISC OAuth (SailPoint Developer Community)](https://developer.sailpoint.com/discuss/t/next-auth-auth-js-integration-with-isc-oauth/56341)

### Run the dev server

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Project structure

High-level folder map:

```text
app/                      # Next.js App Router pages + API routes
  api/auth/               # NextAuth configuration + custom SailPoint OAuth provider
  login/                  # Login page
  policy/                 # Policy pages

components/
  component/              # App-specific feature components (pages/views/forms)
  ui/                     # Reusable UI primitives (buttons, dialogs, tabs, etc.)

lib/
  actions/isc.ts          # Server-side ISC API wrapper (most business logic lives here)
  utils.ts                # Shared utilities

providers/                # React providers (theme)
type/                     # Type augmentation (NextAuth session typing)
middleware.ts             # Route protection via next-auth middleware
```

Folder notes:

- **`app/`**: App Router pages (e.g. `app/policy/page.tsx`) and route handlers under `app/api/*`.
- **`components/component/`**: Feature components that render the app’s screens (policy violations, login, and header).
- **`components/ui/`**: Reusable UI primitives (largely “shadcn/ui”-style components built on Radix UI).
- **`lib/actions/`**: Server Actions / server-only integration logic (ISC API wrappers).
- **`providers/` + `app/providers.tsx`**: Shared React providers (NextAuth `SessionProvider`, `next-themes` theme provider, header wrapper).
- **`type/next-auth.d.ts`**: Extends NextAuth session types (e.g. `session.accessToken`, `session.user.id`, `capabilities`, `tenant`).

## Key libraries and what they do

### `next-auth` (authentication + route protection)

- **Provider config**: `app/api/auth/authOptions.ts`
  - Uses the custom SailPoint OAuth provider defined in `app/api/auth/sailpoint.ts`
  - Stores the ISC **access token** and **refresh token** in a JWT-based session
- **Middleware**: `middleware.ts`
  - Protects all routes except `login` and Next.js/internal paths (API routes are excluded by matcher)

### `sailpoint-api-client` (ISC SDK)

Used by server actions to call ISC endpoints with the end-user access token from the NextAuth session.

### `ai`, `@ai-sdk/gateway`, `@ai-sdk/mcp` (optional AI tool calling)

`lib/actions/isc.ts` includes an optional AI resolution workflow for policy violations:

- `AI_GATEWAY_API_KEY` enables Vercel AI Gateway model calls (preferred)
- `POLICY_RESOLUTION_MODEL` optionally overrides the default policy resolver model
- The policy page includes a GUI model picker with common analysis models (selection is stored locally in the browser)
- An ISC MCP endpoint is called at:
  - `${ISC_BASE_API_URL}/latest/access-requests/mcp`

If `AI_GATEWAY_API_KEY` is not set, the UI can hide/disable this flow via `isOpenAIAvailable()`.

### UI & utilities

- **Tailwind CSS** (`tailwind.config.ts`, `app/globals.css`) for styling
- **Radix UI** + **shadcn/ui-style components** under `components/ui/`
- **Ant Design** (`antd`) for additional UI components
- **`clsx` + `tailwind-merge`** via `lib/utils.ts` (`cn()`) to compose class names
- **`axios`** used in `app/api/auth/authOptions.ts` to refresh ISC access tokens

## Deep dive: `lib/actions/isc.ts`

`lib/actions/isc.ts` is the **server-side integration layer** for ISC (it starts with `"use server"`). UI components import functions from here to keep API logic out of React components.

What it contains:

- **SOD policies**
  - `getPolicies()`
  - `getPolicyViolatedIdentities(query)`
  - Uses `SODPoliciesApi` + Search
- **AI-assisted resolution**
  - `resolvePolicyViolationWithAI(policy, identity)`
  - Uses Vercel AI SDK `generateText()`, AI Gateway, local revoke/search tools, and the ISC MCP create-access-request tool
  - Important limitation (documented in code): the MCP tool can only act for the **current session user**

## Common troubleshooting

- **Stuck in a redirect loop / always sent to `/login`**
  - Verify `NEXTAUTH_URL` matches your local URL
  - Ensure your ISC OAuth app has the callback URL:
    - `http://localhost:3000/api/auth/callback/identitySecureCloud`
- **401/403 errors when calling ISC APIs**
  - Confirm `ISC_BASE_URL` and `ISC_BASE_API_URL` match your tenant/region
  - Confirm `ISC_CLIENT_ID`/`ISC_CLIENT_SECRET` are valid and have appropriate scopes
- **AI flow not available**
  - Set `AI_GATEWAY_API_KEY`

## Scripts

```bash
npm run dev    # start dev server
npm run build  # production build
npm run start  # run production build
npm run lint   # lint
```
