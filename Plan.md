# Implementation Plan

## Goal
Phase için mevcut veri modeli ve mevcut backend capability’lerine sadık, read-only, dış sistemlere açık, token tabanlı bir Public Analytics API v1 tasarlamak ve kademeli olarak hayata geçirmek.

## Assumptions
- V1, Google Analytics Data API’den ilham alacak ama serbest sorgu motoru olmayacak; capability-driven bir read API olacak.
- Public API, mevcut `/public` waitlist rotalarıyla karışmaması için `/public-api/v1` namespace’i altında yayınlanacak.
- Public API token’ları app-scoped olacak; bir token yalnızca tek bir app’in verisini okuyabilecek.
- Token yönetimi ayrı bir internal dashboard surface’i üzerinden yapılacak; SDK ingestion key ile aynı credential kullanılmayacak.
- V1’de device, analytics identity modeli olarak korunacak; GA’deki `user` semantiği taklit edilmeyecek.
- V1’de event params filtering/group-by desteklenmeyecek; mevcut QuestDB storage buna uygun değil.
- V1’de raw export değil, curated reports öncelikli olacak.
- Event retention pratikte ~1 yıl olarak dokümante edilecek; bu mevcut QuestDB partition cleanup davranışından geliyor.

## Tasks
1. **Public API sözleşmesini ve desteklenen capability vocabulary’sini netleştir**
   - Files: `PRD.md`, `Backend.md`, `Frontend.md`, `packages/shared/src/schemas/index.ts`, `packages/shared/src/schemas/common.ts`, `packages/shared/src/index.ts`
   - Changes: V1 için resmi subject/metric/dimension/filter matrisi tanımla; desteklenmeyen kombinasyonları açıkça kapsam dışı bırak; response meta sözleşmesini tanımla (`identityModel`, `freshness`, `retention`, `semantics`).
   - Reuse: Mevcut `packages/shared` schema yapısı, mevcut `Event/Session/Device` response şekilleri
   - Acceptance: Tek bir capability matrix üzerinden backend ve frontend aynı kuralları referans alabiliyor; V1 scope ve non-goal’lar net.

2. **Public read token veri modelini ekle**
   - Files: `apps/server/src/db/schema.ts`, `apps/server/src/lib/keys.ts`, gerekiyorsa yeni migration dosyaları
   - Changes: `public_api_tokens` benzeri yeni tablo ekle; `id`, `appId`, `createdByUserId`, `name`, `tokenHash`, `tokenPrefix`, `scopes`, `expiresAt`, `lastUsedAt`, `revokedAt`, `createdAt` alanlarını tanımla; token’ı yalnız hash olarak sakla; plain token yalnız create response’ta tek sefer gösterilsin.
   - Reuse: `apps` ownership modeli, mevcut key üretme yaklaşımı
   - Acceptance: Token create/list/revoke use-case’leri veri modelinde güvenli şekilde temsil ediliyor; token plain-text olarak DB’ye yazılmıyor.

3. **Public API auth ve scope doğrulama middleware’ini oluştur**
   - Files: `apps/server/src/lib/middleware.ts`, olası yeni dosya `apps/server/src/lib/public-api-auth.ts`
   - Changes: `Authorization: Bearer <token>` alan, hash doğrulayan, token’ın revoked/expired durumunu kontrol eden, app scope ve endpoint scope (`reports:read`, `events:read`, `sessions:read`, `devices:read`, `realtime:read`) doğrulayan middleware ekle.
   - Reuse: `sdkAuthPlugin` ve `authPlugin` error handling pattern’i
   - Acceptance: Public API route’ları SDK key veya cookie session ile değil, yalnız public read token ile erişilebiliyor; hatalar standart error schema dönüyor.

4. **Capability metadata endpoint’ini ekle**
   - Files: yeni `apps/server/src/routes/public-api/meta.ts`, `packages/shared/src/schemas/public-api.ts`
   - Changes: `GET /public-api/v1/apps/:appId/capabilities` endpoint’i ekle; desteklenen domain’ler, metrics, dimensions, filters, realtime support, retention, identity model, semantic windows ve pagination/limit guardrail’lerini dön.
   - Reuse: Mevcut route registration pattern’i, shared schema yaklaşımı
   - Acceptance: Dış client, Phase’in hangi sorguları desteklediğini dokümana bakmadan programatik olarak keşfedebiliyor.

5. **Curated report endpoint’lerini uygula**
   - Files: yeni `apps/server/src/routes/public-api/reports.ts`, `apps/server/src/lib/questdb.ts`, `apps/server/src/routes/event/web.ts`, `apps/server/src/routes/session/web.ts`, `apps/server/src/routes/device/web.ts`
   - Changes:
     - `events/overview`, `events/timeseries`, `events/breakdown`
     - `sessions/overview`, `sessions/timeseries`
     - `devices/overview`, `devices/timeseries`, `devices/breakdown`
     - Internal metric isimlerini public contract’a map et (`dau -> activeDevices`, `daily_sessions -> sessionCount` gibi)
     - Breakdown endpoint’lerinde whitelist dimension/metric eşleşmeleri uygula.
   - Reuse: `getEventStats`, `getEventTimeseries`, `getTopEvents`, mevcut session/device overview ve timeseries sorguları
   - Acceptance: V1’de vaat edilen tüm curated report’lar internal dashboard dışından read-only token ile alınabiliyor.

6. **Raw entity listing ve detail endpoint’lerini ekle**
   - Files: yeni `apps/server/src/routes/public-api/resources.ts`, `packages/shared/src/schemas/public-api.ts`, mevcut `questdb.ts` ve validator yardımcıları
   - Changes:
     - `GET /public-api/v1/apps/:appId/events`
     - `GET /public-api/v1/apps/:appId/events/:eventId`
     - `GET /public-api/v1/apps/:appId/sessions`
     - `GET /public-api/v1/apps/:appId/devices`
     - `GET /public-api/v1/apps/:appId/devices/:deviceId`
     - `GET /public-api/v1/apps/:appId/devices/:deviceId/activity`
     - Public raw list’ler için guardrail’ler ekle; bulk export ürünü gibi davranmasına izin verme.
   - Reuse: Mevcut web route sorgu mantığı, `validatePagination`, `validateDateRange`, `validatePropertySearchFilter`, `getEvents`
   - Acceptance: External consumers debug/integration amaçlı ham verilere sınırlı ve kontrollü şekilde erişebiliyor.

7. **Batch ve realtime read surface’ini ekle**
   - Files: yeni `apps/server/src/routes/public-api/batch.ts`, `apps/server/src/routes/public-api/realtime.ts`, `apps/server/src/lib/online-tracker.ts`, `apps/server/src/lib/sse-manager.ts`
   - Changes:
     - `POST /public-api/v1/apps/:appId/reports/batch` (max 5 request)
     - `GET /public-api/v1/apps/:appId/realtime/snapshot`
     - `GET /public-api/v1/apps/:appId/realtime/stream`
     - `onlineDevices20s` ve `activeDevices60s` gibi semantik farkları isimde ve metadata’da açık et.
   - Reuse: mevcut SSE pipeline, `getOnlineUsers`, `/devices/live` mantığı, event/session/device recent list sorguları
   - Acceptance: Dış sistemler tek request ile dashboard kartlarını çekebiliyor ve gerektiğinde realtime tüketebiliyor.

8. **Public API rate limiting, quota ve response headers’ını ekle**
   - Files: `apps/server/src/lib/rate-limit.ts`, `apps/server/src/index.ts`, yeni/ek `packages/shared/src/schemas/public-api.ts`
   - Changes: `PUBLIC_API` rate limit stratejisi tanımla; token + IP bazlı limit uygula; response header’larına `X-RateLimit-*` bilgilerini ekle; V1 için query-cost yerine request quota + hard caps kullan; `429` davranışını standardize et.
   - Reuse: mevcut Redis-backed rate limit altyapısı
   - Acceptance: Public API abusive usage karşısında kontrollü; client’lar limit ve reset zamanını response’tan görebiliyor.

9. **Internal dashboard token yönetim API’sini ekle**
   - Files: `apps/server/src/routes/app/web.ts`, olası yeni `apps/server/src/routes/public-api-management/web.ts`, `packages/shared/src/schemas/public-api.ts`
   - Changes:
     - token list
     - token create
     - token revoke
     - capabilities summary fetch
     - owner-only secret actions
   - Reuse: mevcut app ownership checks, `authPlugin`, app settings route pattern’i
   - Acceptance: Dashboard içinden app owner public read token üretebiliyor, revoke edebiliyor, son kullanım ve scope bilgilerini görebiliyor.

10. **Frontend management surface ve docs entegrasyonunu ekle**
    - Files: `apps/web/src/app/dashboard/application/api-keys/page.tsx`, yeni `apps/web/src/components/public-api/*`, `apps/web/src/lib/queries/use-public-api.ts`, `apps/web/src/lib/queries/query-keys.ts`, `apps/web/src/lib/api/types.ts`, docs content dosyaları
    - Changes: API Keys sayfasına `SDK API Key` + `Public API` tab/section modeli ekle; token list/create/revoke UI’si ekle; capability summary, scope badges, copy-once token reveal, example curl snippet ve docs CTA ekle; docs portalına Public API sayfaları ekle.
    - Reuse: mevcut API key page UX, TanStack Query hooks, `CopyButton`, `RequireApp`, dialog/card components
    - Acceptance: App owner dashboard’dan public API’yi kurup kullanmaya başlayabiliyor; member/owner yetki farkları UI’da net.

11. **Observability, tests ve rollout guardrail’lerini tamamla**
    - Files: ilgili route test dosyaları (yeni), `apps/server/src/index.ts`, doküman dosyaları
    - Changes: route/unit/integration test’leri ekle; token create/revoke/auth/rate-limit/report mapping senaryolarını test et; structured logging ekle; rollout aşamalarını feature flag/env ile kontrol et.
    - Reuse: mevcut route structure, error schema, logger pattern’i
    - Acceptance: Feature staging’de doğrulanmış, rollback planı olan, ölçülebilir bir release haline geliyor.

## Validation
- Backend
  - Public token create/list/revoke flow testleri
  - Expired/revoked token auth testleri
  - Scope mismatch testleri
  - `capabilities` response schema testleri
  - `events/sessions/devices/realtime` endpoint schema ve permission testleri
  - Rate limit ve quota header testleri
  - Batch request validation testleri (max 5, mixed unsupported types, scope mismatch)
- Frontend
  - API Keys sayfasında Public API section render testleri
  - Token create/revoke mutation success/error durumları
  - Owner/member yetki farkı
  - Copy-once token reveal UX
- Manual checks
  - External curl ile token kullanarak tüm V1 endpoint’ler doğrulanmalı
  - Eventual consistency metadatası, realtime stream ve snapshot davranışı gözlemlenmeli
  - Docs örnekleri gerçek endpoint’lerle smoke test edilmeli
- Edge cases
  - Revoked token ile açık SSE bağlantısı
  - Expired token ile batch request
  - Invalid appId path + valid token combination
  - Unsupported metric/dimension combination
  - Event list’te çok geniş date range ve pageSize abuse girişimleri

## Risks
- Event store ve metadata store ayrık olduğu için GA benzeri serbest sorgu beklentisi oluşabilir; capability metadata ve docs bunu açıkça sınırlamalı.
- `device` tabanlı identity’nin `user` gibi yorumlanması ürün güvenilirliğini zedeleyebilir; response semantics zorunlu.
- Realtime tarafında 20s ve 60s pencereleri farklı; isimlendirme kötü olursa client tarafında kafa karışır.
- Public raw list endpoint’leri bulk export gibi kullanılmaya çalışılabilir; strict limits ve docs şart.
- Event params STRING olarak tutulduğu için custom dimensions beklentisi doğabilir; bu V1’de kapsam dışı bırakılmalı.
- Token güvenliği yanlış kurgulanırsa secret exposure riski doğar; plain token yalnız create anında dönmeli.

## Open Questions
- Public read token’ları yalnız app owner mı yönetsin, yoksa member’lara read-only token create izni verilsin mi?
- V1’de günlük quota header’ları zorunlu mu, yoksa yalnız request rate limit ile mi başlanmalı?
- Public API docs tamamen public mi olacak, yoksa dashboard içinden app-scoped quickstart ile mi desteklenecek?
- V1’de public API için OpenAPI/JSON schema export üretilecek mi?
- `events/breakdown` endpoint’i `screenName` ve `eventName` için tek endpoint altında mı toplanmalı, yoksa ayrı endpoint’ler mi daha açık?

## Files to Modify
- `apps/server/src/index.ts` - yeni `public-api` route group’larını register etmek, rate limit wiring eklemek
- `apps/server/src/db/schema.ts` - public read token tablosunu tanımlamak
- `apps/server/src/lib/keys.ts` - public token üretim helper’larını eklemek
- `apps/server/src/lib/middleware.ts` - public API auth/scope middleware eklemek
- `apps/server/src/lib/rate-limit.ts` - public API stratejisi ve response header desteği eklemek
- `apps/server/src/lib/questdb.ts` - public breakdown/list ihtiyaçları için kontrollü query desteği eklemek
- `apps/server/src/routes/app/web.ts` - dashboard token management endpoint’lerini eklemek
- `packages/shared/src/index.ts` - yeni public API schema export’ları
- `packages/shared/src/schemas/index.ts` - public API schema registration’ı
- `apps/web/src/app/dashboard/application/api-keys/page.tsx` - Public API management UI eklemek
- `apps/web/src/lib/api/types.ts` - yeni response/request tiplerini expose etmek
- `apps/web/src/lib/queries/query-keys.ts` - public API management query key’leri
- `apps/web/src/lib/queries/index.ts` - yeni hook export’ları

## New Files
- `apps/server/src/routes/public-api/index.ts` - public API router composition
- `apps/server/src/routes/public-api/meta.ts` - capabilities endpoint
- `apps/server/src/routes/public-api/reports.ts` - curated report endpoints
- `apps/server/src/routes/public-api/resources.ts` - raw list/detail endpoints
- `apps/server/src/routes/public-api/batch.ts` - batch report endpoint
- `apps/server/src/routes/public-api/realtime.ts` - snapshot + SSE public routes
- `packages/shared/src/schemas/public-api.ts` - public API request/response schemas
- `apps/web/src/components/public-api/public-api-token-table.tsx` - token list UI
- `apps/web/src/components/public-api/create-public-api-token-dialog.tsx` - token create flow
- `apps/web/src/components/public-api/public-api-quickstart-card.tsx` - example curl ve setup guidance
- `apps/web/src/lib/queries/use-public-api.ts` - dashboard token management hooks
- `apps/web/content/docs/public-api/overview.mdx` - public API docs overview
- `apps/web/content/docs/public-api/authentication.mdx` - auth/token docs
- `apps/web/content/docs/public-api/reports.mdx` - report endpoint docs
- `apps/web/content/docs/public-api/realtime.mdx` - realtime docs

## Execution Order
1. PRD, capability matrix ve naming kararlarını netleştir.
2. Shared schemas ve public token DB modelini tasarla.
3. Public token management internal web API’lerini ekle.
4. Public auth/scope/rate-limit middleware’ini ekle.
5. `capabilities` endpoint’ini çıkar ve sözleşmeyi stabilize et.
6. Curated report endpoint’lerini mevcut backend query’lerine map et.
7. Raw list/detail endpoint’lerini sınırlı kapsamla ekle.
8. Batch ve realtime snapshot/stream surface’ini ekle.
9. Frontend token management UI ve docs sayfalarını ekle.
10. Test, observability ve rollout guardrail’lerini tamamla.
11. Staging smoke test ve örnek client doğrulaması yap.
