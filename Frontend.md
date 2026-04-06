# Frontend Plan — Phase Public Analytics API

## Goal
Dashboard ve docs experience’ını, app owner’ın Public Analytics API’yi güvenli şekilde açabilmesi, token üretebilmesi, desteklenen capability’leri anlayabilmesi ve entegrasyonu hızlıca başlatabilmesi için genişletmek.

## Scope Summary
Frontend tarafındaki iş yalnızca yeni public API’yi anlatmak değil; aynı zamanda bu özelliği Phase dashboard içinde yönetilebilir ve anlaşılır hale getirmek.

V1 frontend scope:
- Public API token management UI
- capability summary UI
- quickstart / example curl snippets
- owner/member permission states
- docs portal sayfaları
- internal dashboard queries/mutations

V1 frontend scope dışı:
- interactive API explorer
- token usage analytics dashboard
- embedded query builder
- external SDK generator

---

## Current Frontend Context

### Existing Navigation
`apps/web/src/app/dashboard/sidebar.tsx`

Dashboard navigation bugün şunları sunuyor:
- Analytics
  - Users
  - Sessions
  - Activity
  - Realtime
- Application
  - Settings
  - API Keys
  - Team

### Existing API Keys Surface
`apps/web/src/app/dashboard/application/api-keys/page.tsx`

Mevcut sayfa:
- SDK API key’i gösteriyor
- key visibility toggle içeriyor
- copy action var
- owner-only rotate action var
- bilgi kartı ile kullanım semantiğini açıklıyor

Bu, Public API için en doğal genişleme noktasıdır.

### Existing Query Layer
- TanStack Query tabanlı
- `apps/web/src/lib/queries/*`
- `fetchApi()` cookie session ile internal `/web/*` endpoint’lerine gidiyor
- query keys merkezi tutuluyor

### Existing Docs Surface
- `/docs` route’u mevcut
- Fumadocs tabanlı docs sistemi var
- Public API docs eklemek doğal ve mevcut yapıyla uyumlu

---

## Product UX Decision

## Primary UX Decision
Public API management, yeni ayrı bir sidebar item yerine mevcut **API Keys** sayfası altında ikinci bir section/tab olarak açılmalı.

### Why
- SDK key ve Public API token aynı zihinsel modelin parçası: “application credentials”
- sidebar’a yeni item eklemeye gerek kalmaz
- mevcut owner-only secret action pattern’i tekrar kullanılabilir
- kullanıcı tek yerde hem ingestion hem read access credential’larını görür

## Proposed Page Structure
### Route
`/dashboard/application/api-keys?app=<appId>`

### Sections / Tabs
1. `SDK API Key`
2. `Public API`

### Public API Section Content
1. Public API intro card
2. Capability summary card
3. Token table
4. Create token action
5. Token reveal-once success state
6. Revoke action
7. Quickstart snippets
8. Docs CTA

---

## UX Requirements

## 1. Intro / Positioning Card
Amaç:
- bu credential’ın SDK key’den farklı olduğunu net anlatmak
- read-only olduğunu belirtmek
- external systems use-case’ini açıklamak

Örnek mesaj başlıkları:
- “Public Analytics API”
- “Read-only external access for your app analytics”
- “Use this for scripts, dashboards, and integrations”

Card içinde ayrıca şu ayrım açık olmalı:
- SDK key: write / ingestion
- Public API token: read / query

## 2. Capability Summary Card
Dashboard’da kullanıcıya docs’a gitmeden desteklenen yüzey gösterilmeli.

### İçerik
- identity model: `Device-based`
- supported report families:
  - events
  - sessions
  - devices
  - realtime
- important semantics:
  - bounce rate definition
  - online devices window
  - active devices window
- current limitations:
  - no event param filtering
  - no funnels
  - no retention/cohorts
  - no user-level semantics

Bu kart `capabilities` endpoint’inden beslenmeli; statik text yerine backend truth source kullanılmalı.

## 3. Token Table
### Columns
- Name
- Prefix / masked token identifier
- Scopes
- Expires At
- Last Used At
- Created At
- Status (`active`, `expired`, `revoked`)
- Actions

### Actions
- Copy token (yalnız create sonrası ephemeral state’te)
- Revoke
- View docs / quickstart

### Empty State
- “No public API tokens yet”
- create CTA
- kısa açıklama

## 4. Create Token Dialog
### Fields
- Token name
- Scopes (multi-select checkbox/badge)
- Expiration (optional)

### UX Rules
- create sonrası plain token tek sefer gösterilmeli
- kullanıcı ekrandan ayrılırsa token tekrar fetch edilememeli
- copy CTA çok görünür olmalı
- warning text olmalı:
  - “This token will only be shown once”

## 5. Revoke Flow
- confirmation dialog zorunlu
- destructive action styling kullanılmalı
- revoke edilen token anında table state’te `revoked` görünmeli
- mevcut açık quickstart snippet’lar uyarı vermeli

## 6. Permission States
### Owner
- create token
- revoke token
- view token metadata
- see one-time secret after create

### Member
V1 önerisi:
- token metadata’yı görebilir
- secret create/revoke işlemi yapamaz

Alternatif karar backend ile netleştirilmeli. Frontend state model buna göre esnek kurulmalı.

## 7. Quickstart Block
Bu block kullanıcıyı docs’a göndermeden ilk isteğini attırmalı.

### İçerik
- curl example
- auth header example
- `capabilities` request
- sample events overview request
- sample realtime snapshot request

### Inputs
- appId
- newly created token (ephemeral only)
- selected scope set

## 8. Docs CTA
API Keys sayfasından docs’a giden açık CTA olmalı:
- “Read the Public API docs”
- docs yeni sekmede açılabilir

---

## Information Architecture

## Dashboard Changes
### Existing Page to Extend
- `apps/web/src/app/dashboard/application/api-keys/page.tsx`

### New UI Components
- `apps/web/src/components/public-api/public-api-intro-card.tsx`
- `apps/web/src/components/public-api/public-api-capabilities-card.tsx`
- `apps/web/src/components/public-api/public-api-token-table.tsx`
- `apps/web/src/components/public-api/create-public-api-token-dialog.tsx`
- `apps/web/src/components/public-api/revoke-public-api-token-dialog.tsx`
- `apps/web/src/components/public-api/public-api-quickstart-card.tsx`
- `apps/web/src/components/public-api/public-api-scope-badges.tsx`

## Query Layer Changes
### New Hooks
- `usePublicApiCapabilities(appId)`
- `usePublicApiTokens(appId)`
- `useCreatePublicApiToken()`
- `useRevokePublicApiToken()`

### Files
- `apps/web/src/lib/queries/use-public-api.ts`
- `apps/web/src/lib/queries/query-keys.ts`
- `apps/web/src/lib/queries/index.ts`
- `apps/web/src/lib/api/types.ts`

## Docs Changes
### New Docs Pages
- overview
- authentication
- capabilities
- reports
- resources
- realtime
- errors & rate limits

### Likely Files
- `apps/web/content/docs/public-api/overview.mdx`
- `apps/web/content/docs/public-api/authentication.mdx`
- `apps/web/content/docs/public-api/capabilities.mdx`
- `apps/web/content/docs/public-api/reports.mdx`
- `apps/web/content/docs/public-api/resources.mdx`
- `apps/web/content/docs/public-api/realtime.mdx`
- `apps/web/content/docs/public-api/errors-and-limits.mdx`

---

## Data Contracts Needed in Frontend

## Token Metadata Type
UI için en az şu alanlar gerekli:
- `id`
- `name`
- `tokenPrefix`
- `scopes`
- `expiresAt`
- `lastUsedAt`
- `revokedAt`
- `createdAt`
- `status`

## Create Token Response
Ek olarak one-time secret döndürmeli:
- `plainTextToken`
- `tokenPrefix`
- metadata alanları

## Capabilities Response
UI’nin render etmesi gereken alanlar:
- `identityModel`
- `retention`
- `semantics`
- `domains`
  - metrics
  - dimensions
  - filters
  - supported reports
- `limits`
  - max date range
  - max batch size
  - max breakdown limit
  - max page size

---

## UX Content Rules
1. `User` kelimesi gerekiyorsa çok dikkatli kullanılmalı; Public API alanında mümkünse `device` tercih edilmeli.
2. `Active users` yerine `active devices` yazılmalı.
3. Online/active realtime window’ları label’da açık olmalı.
   - `Online devices (20s)`
   - `Active devices (60s)`
4. “Google Analytics compatible” gibi yanlış beklenti yaratacak copy kullanılmamalı.
5. Event params limitation docs dışında dashboard’da da kısa not ile belirtilmeli.

---

## UI States to Design

## Loading States
- app loading
- capabilities loading
- token list loading
- create mutation pending
- revoke mutation pending

## Empty States
- no tokens
- no capability data
- no app selected

## Error States
- failed to load token list
- failed to create token
- failed to revoke token
- failed to load capabilities
- forbidden / owner-only state

## Success States
- token created and copied
- token revoked
- docs link opened

---

## Accessibility Requirements
- all create/revoke/copy actions keyboard accessible olmalı
- masked/unmasked token toggle button’larının `aria-label`’ı açık olmalı
- success/error state’ler screen reader ile duyurulmalı
- code blocks ve copy buttons focus-visible olmalı
- destructive actions confirmation dialog ile korunmalı

---

## Frontend Task Breakdown

1. **API Keys page bilgi mimarisini genişlet**
   - mevcut SDK key section’ını koru
   - Public API section/tab ekle
   - page copy’sini ingestion vs read-only ayrımını açıklayacak şekilde güncelle

2. **Public API token management query layer’ını ekle**
   - hook’lar
   - types
   - query keys
   - optimistic/invalidating mutation flow

3. **Token management components’ini oluştur**
   - table
   - create dialog
   - revoke dialog
   - scope badge render
   - one-time secret panel

4. **Capabilities summary render’ını ekle**
   - backend truth source’dan beslenen domain cards
   - supported metrics/dimensions/filters listesi
   - semantic windows ve retention alanı

5. **Quickstart snippets ve docs CTA ekle**
   - curl examples
   - capabilities example
   - events overview example
   - realtime snapshot example

6. **Docs content ekle**
   - public API docs sayfaları
   - internal dashboard ile tutarlı copy

7. **Permission ve error states’i tamamla**
   - owner-only controls
   - member fallback UI
   - empty/error/loading states

---

## Acceptance Criteria
- App owner, API Keys sayfasından Public API token oluşturabiliyor.
- Create sonrası token tek sefer gösteriliyor ve kopyalanabiliyor.
- Aynı token daha sonra plain text olarak tekrar fetch edilemiyor.
- Token listesi scopes, last used, expiry, status ile görüntüleniyor.
- Revoke işlemi başarıyla yapılıyor ve UI anında güncelleniyor.
- Capabilities card backend’den gelen gerçek support matrix’i gösteriyor.
- Quickstart block çalışan curl örnekleri sunuyor.
- Docs portalında Public API sayfaları mevcut.
- Owner/member yetki farkı UI’da net.

---

## Risks
- API Keys sayfası çok kalabalıklaşabilir; bilgi yoğunluğu section/tabs ile dengelenmeli.
- One-time token reveal flow kötü kurgulanırsa kullanıcı token’ı kaybettiğinde kafa karışıklığı yaşayabilir; warning ve recreate guidance şart.
- Backend capability matrix değişirse frontend hardcoded copy ile drift yaşayabilir; mümkün olduğunca backend-driven render tercih edilmeli.
- `device` vs `user` semantiği yanlış etiketlenirse ürün algısı bozulur.

---

## Open Questions
- Public API section API Keys sayfasında mı kalmalı, yoksa ileride ayrı `/dashboard/application/public-api` route’una taşınmalı mı?
- Member kullanıcılar token metadata’yı görebilmeli mi?
- Token scopes create dialog’da hepsi default seçili mi başlamalı, yoksa minimal scopes mı seçilmeli?
- Docs CTA dashboard içinde mi kalmalı, yoksa inline embedded docs deneyimi mi sunulmalı?

---

## Files to Modify
- `apps/web/src/app/dashboard/application/api-keys/page.tsx` - Public API section/tab eklemek
- `apps/web/src/lib/api/types.ts` - token management ve capabilities response tipleri eklemek
- `apps/web/src/lib/queries/query-keys.ts` - public API management query key’leri tanımlamak
- `apps/web/src/lib/queries/index.ts` - yeni hook export’ları
- `apps/web/src/app/docs/docs-source.ts` - docs navigation organize etmek gerekiyorsa güncellemek

## New Files
- `apps/web/src/components/public-api/public-api-intro-card.tsx`
- `apps/web/src/components/public-api/public-api-capabilities-card.tsx`
- `apps/web/src/components/public-api/public-api-token-table.tsx`
- `apps/web/src/components/public-api/create-public-api-token-dialog.tsx`
- `apps/web/src/components/public-api/revoke-public-api-token-dialog.tsx`
- `apps/web/src/components/public-api/public-api-quickstart-card.tsx`
- `apps/web/src/components/public-api/public-api-scope-badges.tsx`
- `apps/web/src/lib/queries/use-public-api.ts`
- `apps/web/content/docs/public-api/overview.mdx`
- `apps/web/content/docs/public-api/authentication.mdx`
- `apps/web/content/docs/public-api/capabilities.mdx`
- `apps/web/content/docs/public-api/reports.mdx`
- `apps/web/content/docs/public-api/resources.mdx`
- `apps/web/content/docs/public-api/realtime.mdx`
- `apps/web/content/docs/public-api/errors-and-limits.mdx`

---

## Recommended Delivery Order
1. Backend contract’ı ve shared types netleşsin.
2. Frontend types + query hooks eklensin.
3. API Keys page layout refactor edilsin.
4. Token management components eklensin.
5. Capabilities card ve quickstart card eklensin.
6. Docs pages eklensin.
7. Error/loading/accessibility polish yapılsın.
