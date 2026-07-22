# Project instructions

## Workspace

- Package manager: Bun. Use `bun`, not npm, pnpm, or yarn.
- Bun workspaces monorepo: `apps/server` (Elysia), `apps/web` (Next.js), `apps/mobile` (Expo), `packages/shared`, `packages/sdk`.

## Commands

- `bun dev` — server + web
- `bun dev:server` / `bun dev:web`
- `bun dev:mobile` — Expo Metro with `--dev-client` from `apps/mobile` (no Bun filter)
- `bun ios` / `bun android` / `bun ios:sim` / `bun android:sim` / `bun ios:device` / `bun android:device` / `bun ios:release` / `bun android:release` — run via `cd apps/mobile && bunx expo ...`
- `bun check` — Ultracite
- `bun typecheck`

## Package boundaries

- `@phase/shared` — Zod schemas and API types. Mobile-safe.
- `phase-analytics` / `packages/sdk` — ingest SDK only (`/sdk/*` with app key). Not the dashboard API.
- `apps/mobile` talks to `apps/server` over HTTP (`/web/*` + Better Auth). Do not import server runtime, DB, or Elysia into the native bundle.
- Prefs: `expo-sqlite` localStorage polyfill via `src/lib/prefs.ts`. Secrets: `expo-secure-store`.
- Analytics dogfood: `phase-analytics/expo` via `src/lib/analytics.tsx`. Screen tracking off; debug on in `__DEV__`.

## Mobile skill routing

Skills live under `.pi/skills/` (symlinked from `.agents/skills/`). Read the relevant skill before implementing.

- `building-native-ui` — default Expo screens, HIG, glass, icons, layout
- `apple-design` — motion, springs, materials, haptics (adapt web examples to Reanimated)
- `expo-router` — routes, NativeTabs, stacks, sheets, headers
- `expo-ui` — `@expo/ui` Host / SwiftUI / Compose; keep platform files in `components/*.ios.tsx`
- `use-dom` — Visx charts and other DOM-only libs inside Expo
- `native-data-fetching` — fetch, TanStack Query, auth cookies, offline
- `expo-module` — custom native modules only when Expo APIs are insufficient
- `serve-sim` — Apple Simulator control / QA

### Routing examples

- Screen + nav: `expo-router` + `building-native-ui`
- Charts: `use-dom` + `building-native-ui`
- API / session: `native-data-fetching`
- `@expo/ui` form: `expo-ui` + `building-native-ui`

## Mobile implementation rules

- Keep mobile code in `apps/mobile`; backend in `apps/server`.
- Dashboard API: `fetch` + Cookie header from Better Auth Expo SecureStore (no Eden Treaty).
- No Polar / billing UI in mobile. No forgot-password UI in v1.
- English only. Cache-backed reads via TanStack Query.
- After changes, run the narrowest relevant check.
