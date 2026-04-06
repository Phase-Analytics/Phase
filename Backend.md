# Backend Plan — Phase Public Analytics API

## Goal
Phase backend içinde, mevcut analytics capability’lerini dürüstçe expose eden, token tabanlı, app-scoped, read-only bir Public Analytics API v1 eklemek.

## Design Constraints
1. Mevcut `/sdk` surface write/ingestion içindir; public read access ile birleştirilmeyecek.
2. Mevcut `/web` surface dashboard/session-cookie kullanır; external consumers için doğrudan reuse edilmemeli.
3. Mevcut `/public` namespace waitlist/public marketing uçları için ayrılmıştır; analytics API burada açılmamalı.
4. Event data QuestDB’de, device/session metadata Postgres’tedir; GA-style universal query engine yapılmayacak.
5. V1’de event params queryability yoktur; raw params only-detail düzeyinde kalacaktır.
6. V1’de identity modeli `device` olarak kalacaktır.

---

## Recommended Namespace
`/public-api/v1`

### Why
- mevcut `/public` ile collision olmaz
- versioning kolay olur
- docs örneklerinde açık ve anlaşılırdır

---

## Current Backend Reality

## Existing Route Groups
- `/sdk/*` — ingestion
- `/web/*` — dashboard/internal read surface
- `/public/*` — waitlist/public endpoints
- `/auth/*`
- `/health`

## Existing Analytics Query Sources
### QuestDB-backed
- event list
- event detail
- top events
- top screens
- event overview
- event timeseries

### Postgres-backed
- sessions list/overview/timeseries
- devices list/overview/timeseries/detail/activity
- device property filtering
- live/active calculations

### Realtime-backed
- SSE stream
- online users snapshot logic

---

## Product-to-Backend Mapping Principle
Public API, mevcut web route’larını dışarı aynen açmak yerine şu mantıkla inşa edilmeli:

1. **Public contract ayrı tanımlanır**
2. **Mümkün olan yerde mevcut query helper’ları reuse edilir**
3. **Internal metric isimleri public isimlere map edilir**
4. **Unsupported combinations request validation seviyesinde reddedilir**

Bu, hem temiz bir dış contract hem de minimum tekrar sağlar.

---

## Proposed Backend Architecture

## 1. New Token Table
### Table Name
`public_api_tokens`

### Suggested Columns
- `id: text` (PK)
- `app_id: text` (FK -> apps.id)
- `created_by_user_id: text` (FK -> user.id)
- `name: text`
- `token_hash: text` (unique)
- `token_prefix: text`
- `scopes: text[]`
- `expires_at: timestamp nullable`
- `last_used_at: timestamp nullable`
- `revoked_at: timestamp nullable`
- `created_at: timestamp`

### Rules
- plain token hiçbir zaman DB’ye yazılmayacak
- create sonrası yalnız tek response’ta plain token dönecek
- token prefix UI/debug amaçlı tutulacak
- revoke soft state olacak (`revoked_at`)

### Why Hash + Prefix
- hash güvenlik için
- prefix dashboard list ve debugging için

---

## 2. Token Generation Strategy
### Existing Reference
`apps/server/src/lib/keys.ts`

### Proposed Additions
- `generatePublicApiToken()`
- `hashPublicApiToken()`

### Token Format
Örnek:
- `phase_pat_<random>`

Format amacı:
- SDK key’den görsel olarak ayrıştırmak
- support/debug sırasında tipi anlamayı kolaylaştırmak

---

## 3. New Middleware / Auth Layer

## Public Read Auth Plugin
### Responsibilities
- Authorization header parse etmek
- token hash lookup yapmak
- revoked/expired kontrolü yapmak
- app path ile token app scope’unu eşleştirmek
- requested endpoint scope’unu doğrulamak
- request context’e `publicToken`, `app`, `scopes` eklemek
- gerekiyorsa `lastUsedAt` güncellemek

### Likely Implementation Paths

`apps/server/src/lib/middleware.ts` içine yeni `publicApiAuthPlugin`

### Recommendation
Ayrı dosya daha temiz olur; `middleware.ts` zaten auth/sdkauth içeriyor.

### Scope Enforcement
Endpoint family’ye göre scope doğrulama:
- reports endpoints -> `reports:read`
- events resources -> `events:read`
- sessions resources -> `sessions:read`
- devices resources -> `devices:read`
- realtime endpoints -> `realtime:read`

---

## 4. Route Layout

## New Route Folder
- `apps/server/src/routes/public-api/index.ts`
- `apps/server/src/routes/public-api/meta.ts`
- `apps/server/src/routes/public-api/reports.ts`
- `apps/server/src/routes/public-api/resources.ts`
- `apps/server/src/routes/public-api/batch.ts`
- `apps/server/src/routes/public-api/realtime.ts`

## Registration
`apps/server/src/index.ts`

Yeni route group:
- `/public-api`
- dedicated CORS
- dedicated rate limit
- public auth middleware usage

### Suggested Structure
- `/public-api/v1/apps/:appId/capabilities`
- `/public-api/v1/apps/:appId/reports/*`
- `/public-api/v1/apps/:appId/events*`
- `/public-api/v1/apps/:appId/sessions*`
- `/public-api/v1/apps/:appId/devices*`
- `/public-api/v1/apps/:appId/realtime/*`

---

## 5. Capability Metadata Endpoint

## Endpoint
`GET /public-api/v1/apps/:appId/capabilities`

## Backend Source of Truth
Bu endpoint hardcoded text değil, backend tanımlı capability config’ten gelmeli.

### Recommendation
Yeni helper:
- `apps/server/src/lib/public-api-capabilities.ts`

Bu helper tek yerde şunları tanımlasın:
- supported report families
- metrics
- dimensions
- filters
- semantic windows
- max limits
- retention hints

### Why
- docs, frontend ve backend aynı matrisi kullanabilsin
- unsupported combinations kolayca validate edilsin

---

## 6. Reports Endpoints

## Events
### Overview
Public endpoint, doğrudan mevcut `getEventStats()` mantığını reuse edebilir.

### Timeseries
Mevcut `getEventTimeseries()` reuse edilebilir.

### Breakdown
Mevcut `getTopEvents()` ve `getTopScreens()` mantığı genişletilmeli.

#### V1 Supported Combinations
- `dimension=eventName`, `metric=eventCount`
- `dimension=screenName`, `metric=eventCount`

#### Not Supported
- country/platform/city breakdown
- params breakdown
- arbitrary metric combinations

## Sessions
### Overview
Mevcut `/web/sessions/overview` sorgusu extraction ile reuse edilmeli.

### Timeseries
Mevcut metrics map:
- internal `daily_sessions` -> public `sessionCount`
- internal `avg_duration` -> public `avgSessionDuration`
- internal `bounce_rate` -> public `bounceRate`

### V1 Decision
Session breakdown endpoint V1’de eklenmeyecek.

## Devices
### Overview
Mevcut `/web/devices/overview` reuse.

### Timeseries
Mevcut internal metrics:
- `dau`
- `total`

Public mapping:
- `activeDevices`
- `totalDevices`

### Breakdown
Mevcut overview query’lerde platform/country/city count üretimi var. Bunlar reusable helper’a taşınıp aşağıdaki public combinations desteklenebilir:
- `dimension=platform`, `metric=deviceCount`
- `dimension=country`, `metric=deviceCount`
- `dimension=city`, `metric=deviceCount`

---

## 7. Raw Resource Endpoints

## Events
### Endpoints
- `GET /public-api/v1/apps/:appId/events`
- `GET /public-api/v1/apps/:appId/events/:eventId`

### Reuse
- `getEvents()`
- `getEventById()`
- existing date validation

### V1 Filters
- `startDate`
- `endDate`
- `eventName`
- `sessionId`
- `deviceId`
- `page`
- `pageSize`

### Notes
- params list response’ta dönmeyebilir; detail response’ta dönmeli
- public raw list export endpoint’i gibi davranmamalı

## Sessions
### Endpoint
- `GET /public-api/v1/apps/:appId/sessions`

### Reuse
Mevcut sessions list mantığı abstraction’a taşınıp reuse edilmeli.

### V1 Filters
- `startDate`
- `endDate`
- `deviceId`
- `page`
- `pageSize`

## Devices
### Endpoints
- `GET /public-api/v1/apps/:appId/devices`
- `GET /public-api/v1/apps/:appId/devices/:deviceId`
- `GET /public-api/v1/apps/:appId/devices/:deviceId/activity`

### Reuse
- existing list/detail/activity handlers
- `validatePropertySearchFilter()`
- `buildPropertySearchFilters()`

### V1 Filters
- `startDate`
- `endDate`
- `platform`
- `properties`
- `page`
- `pageSize`

---

## 8. Batch Endpoint

## Endpoint
`POST /public-api/v1/apps/:appId/reports/batch`

## Payload Pattern
```json
{
  "requests": [
    { "type": "events.overview" },
    { "type": "events.breakdown", "dimension": "eventName", "metric": "eventCount", "limit": 10 },
    { "type": "devices.overview" }
  ]
}
```

## V1 Rules
- max 5 child requests
- all must target same app
- each child individually validated
- partial failure yerine request-level validation hatası tercih edilmeli

## Implementation Strategy
Yeni service helper önerisi:
- `apps/server/src/lib/public-api-batch.ts`

Bu helper child request’leri dispatch eder, response order’ını korur.

---

## 9. Realtime Endpoints

## Snapshot
### Endpoint
`GET /public-api/v1/apps/:appId/realtime/snapshot`

### Suggested Response
- `onlineDevices20s`
- `activeDevices60s`
- `recentEvents`
- `recentSessions`
- `recentDevices`
- `generatedAt`
- `meta`

### Implementation Notes
- `onlineDevices20s` -> `getOnlineUsers(appId)`
- `activeDevices60s` -> mevcut `/devices/live` mantığı
- recent events -> QuestDB latest N query
- recent sessions -> Postgres latest N query
- recent devices -> Postgres latest N query

## Stream
### Endpoint
`GET /public-api/v1/apps/:appId/realtime/stream`

### Reuse
- mevcut `sseManager`
- public auth ile yeni router

### Important Rule
Realtime stream auth, connection establishment sırasında scope doğrulamalı ve token revoke/expiry durumunda yeniden bağlanmalarda reddedilmeli.

---

## 10. Rate Limiting and Quota

## Existing Infrastructure
`apps/server/src/lib/rate-limit.ts`
Redis-backed rate limiting zaten mevcut.

## V1 Recommendation
Yeni strategy ekle:
- `PUBLIC_API`

### Limit Shape
- token + IP birlikte değerlendirilir
- request rate limit düşük ama makul tutulur
- realtime stream için ayrıca concurrent connection guard düşünülür

### Example Direction
- burst request limit
- conservative defaults
- env ile override edilebilir yapı

## Hard Guardrails
Ayrıca route validation seviyesinde:
- max report date range
- max pageSize
- max breakdown limit
- batch max 5
- unsupported combo rejection

## Headers
Tüm public responses mümkünse şunları dönmeli:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

Optional future:
- quota-day headers
- query-cost headers

---

## 11. Shared Schema Work

## New Shared Schema File
- `packages/shared/src/schemas/public-api.ts`

## Needed Schemas
### Token Management
- create token request
- create token response
- token metadata list
- revoke response

### Public API Read
- capabilities response
- batch request/response
- reports response shapes
- breakdown request validation enums
- realtime snapshot response

### Why Shared Matters
- frontend dashboard
- docs examples
- backend route typing
aynı contract’tan beslensin.

---

## 12. Internal Dashboard Management Endpoints
Public read surface dışındaki ama feature için gerekli internal endpoints:

### Suggested Endpoints
- `GET /web/apps/:id/public-api/tokens`
- `POST /web/apps/:id/public-api/tokens`
- `DELETE /web/apps/:id/public-api/tokens/:tokenId`
- `GET /web/apps/:id/public-api/capabilities`

### Access Model
V1 önerisi:
- create/revoke -> owner only
- metadata read -> owner, member (ürün kararı açık)

### Reuse
Mevcut `appWebRouter` içindeki owner/member access pattern’leri reuse edilebilir.

---

## 13. Validation Rules

## Date Range
Public API için mevcut validation’dan daha açık product guardrail eklenmeli:
- max 90 days for report endpoints
- invalid/too wide range -> `400 VALIDATION_ERROR`

## Page Size
- public raw list max page size internal web API’den bağımsız tanımlanmalı
- export davranışı oluşmaması için conservative tutulmalı

## Breakdown Limits
- limit positive integer
- max limit low tutulmalı (örn. 50)

## Scope Validation
- endpoint family bazlı zorunlu

## Capability Validation
- unsupported dimension/metric pair -> `400 VALIDATION_ERROR`
- unsupported domain report -> `404` veya `400` yerine capability-driven `400` daha uygun

---

## 14. Logging and Observability

## Structured Logging
Public API request log’larında şunlar faydalı olur:
- appId
- tokenId
- endpoint family
- scope
- response status
- duration
- rate limit decision

### Never Log
- plain token
- authorization header
- raw secret values

## Metrics to Track
- request count by endpoint family
- 401/403/429 rates
- token create/revoke events
- SSE active connections
- batch usage frequency
- most requested report types

---

## 15. Testing Plan

## Unit Tests
- token hashing/generation
- capability matrix validation
- scope checks
- guardrail validation

## Integration Tests
- create/list/revoke token flow
- auth success/failure
- reports endpoint success/failure
- unsupported combo rejection
- rate limit responses
- batch validation
- realtime snapshot auth

## Manual Smoke Tests
- curl ile token create sonrası `capabilities`
- events overview
- sessions timeseries
- devices breakdown
- realtime snapshot
- revoked token ile access denial

---

## 16. File Plan

## Files to Modify
- `apps/server/src/index.ts` - new public-api route group registration
- `apps/server/src/db/schema.ts` - public token table
- `apps/server/src/lib/keys.ts` - token generation helpers
- `apps/server/src/lib/middleware.ts` - auth integration or shared helpers
- `apps/server/src/lib/rate-limit.ts` - `PUBLIC_API` strategy
- `apps/server/src/lib/questdb.ts` - public breakdown/latest queries için ek helper’lar
- `apps/server/src/routes/app/web.ts` - dashboard management endpoints
- `packages/shared/src/index.ts` - schema export
- `packages/shared/src/schemas/index.ts` - new schema wiring

## New Files
- `apps/server/src/lib/public-api-auth.ts`
- `apps/server/src/lib/public-api-capabilities.ts`
- `apps/server/src/lib/public-api-batch.ts`
- `apps/server/src/routes/public-api/index.ts`
- `apps/server/src/routes/public-api/meta.ts`
- `apps/server/src/routes/public-api/reports.ts`
- `apps/server/src/routes/public-api/resources.ts`
- `apps/server/src/routes/public-api/batch.ts`
- `apps/server/src/routes/public-api/realtime.ts`
- `packages/shared/src/schemas/public-api.ts`

---

## 17. Delivery Phases

### Phase A
- shared schema design
- DB token table
- token management internal web endpoints
- public auth plugin

### Phase B
- capabilities endpoint
- events/sessions/devices reports
- rate limit headers

### Phase C
- raw resources
- batch endpoint
- realtime snapshot

### Phase D
- realtime stream
- docs/support polish
- observability hardening

---

## Risks
1. Web route logic kopyalanırsa drift oluşabilir; shared service extraction tercih edilmeli.
2. Public contract ile internal metric isimleri aynı bırakılırsa semantics karışabilir; public aliases kullanılmalı.
3. Token management owner/member kararı netleşmezse access model tutarsızlaşır.
4. Realtime recent entities snapshot’ı yanlış kaynaktan beslenirse tutarsızlık oluşabilir; explicit source seçilmeli.
5. Public API’nin export ürünü gibi kullanılmasını engellemek için limits gerçekten enforce edilmelidir.

---

## Open Questions
1. Public token management tamamen `appWebRouter` içine mi eklenmeli, yoksa ayrı bir internal router mı açılmalı?
2. `lastUsedAt` her request’te senkron mu güncellensin, yoksa async/debounced mı tutulmalı?
3. Daily quota V1’e alınacak mı, yoksa yalnız request rate limit ile mi başlanacak?
4. Public API report responses mevcut shared schema’ları mı wrap etmeli, yoksa tamamen yeni `public-api.ts` contract’ı mı kullanılmalı?

---

## Backend Recommendation Summary
Backend tarafında en doğru yaklaşım:
- yeni token tablosu,
- ayrı public auth plugin,
- `/public-api/v1` namespace,
- capability metadata driven validation,
- curated report endpoints,
- sınırlı raw resources,
- Redis-backed rate limit + hard caps,
- internal dashboard management endpoints.

Bu yaklaşım, mevcut Phase mimarisini zorlamadan güvenli ve düzgün bir Public Analytics API v1 çıkarır.
