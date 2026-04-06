# PRD — Phase Public Analytics API v1

## Status
Draft

## Owner
Phase

## Last Updated
2026-04-06

## Summary
Phase, bugün dashboard içinden okunabilen analytics verisini dış sistemlere güvenli ve read-only şekilde açmak istiyor. Hedef; kullanıcıların kendi app verilerini script’lerden, BI araçlarından, internal services’lerden ve partner entegrasyonlarından çekebilmesini sağlamak.

Bu ürün, Google Analytics Data API’den ilham alacak; ancak Phase’in mevcut veri modeli, saklama yapısı ve sorgu capability’leri nedeniyle **GA benzeri serbest sorgu motoru olmayacak**. V1 ürün yaklaşımı:

- token tabanlı read-only access,
- capability metadata ile self-describing API,
- curated report endpoint’leri,
- sınırlı raw entity listing,
- realtime snapshot/stream desteği.

## Problem Statement
Bugün Phase verisi esas olarak dashboard UI üzerinden erişilebilir durumda. Bu şu ihtiyaçları karşılamıyor:

- müşterinin Phase verisini kendi dashboard’una çekmesi,
- script/cron job ile rapor üretmesi,
- partner entegrasyonları yapması,
- BI/warehouse tarafına kontrollü read erişimi vermesi,
- app özel canlı istatistikleri dış yüzeylerde göstermesi.

Aynı zamanda doğrudan mevcut internal `/web/*` API’lerini dış dünyaya açmak da doğru değil; çünkü bunlar cookie session, dashboard use-case’i ve internal UI ihtiyaçlarına göre şekillenmiş durumda.

## Product Opportunity
Doğru tasarlanmış bir Public Analytics API Phase’e şu faydaları sağlar:

- dashboard dışı entegrasyonlar için resmi surface,
- product analytics verisini “platform” olarak konumlama,
- partner/agency/in-house data tooling kullanımını açma,
- gelecekte SDK + dashboard + API + docs şeklinde daha bütün bir ürün sunma.

## Current State

### Backend Reality
Phase backend bugün iki ana analytics veri kaynağı kullanıyor:

1. **QuestDB**
   - event storage
   - güçlü olduğu alanlar: event list, top events, top screens, event count, event timeseries

2. **Postgres**
   - devices, sessions, app metadata
   - güçlü olduğu alanlar: device/session overview, device properties filter, session duration, bounce rate, active/live sayımlar

### Existing Read Capabilities
Phase bugün aşağıdaki analytics surface’lere sahip:

#### Events
- raw event list
- event detail
- top events
- top screens
- event overview
- daily event timeseries

#### Sessions
- session list
- session overview
- session timeseries
  - daily sessions
  - average duration
  - bounce rate

#### Devices
- device list
- device detail
- device overview
- live active devices
- device timeseries
  - active devices
  - total devices
- device activity timeseries
- device property filtering

#### Realtime
- SSE stream
- online users snapshot logic
- new event/session/device activity push

### Existing Data Model Constraints
#### Event rows contain
- `event_id`
- `session_id`
- `device_id`
- `app_id`
- `name`
- `params`
- `is_screen`
- `is_debug`
- `timestamp`

#### Device rows contain
- `device_id`
- `app_id`
- `platform`
- `os_version`
- `locale`
- `model`
- `country`
- `city`
- `properties`
- `first_seen`

#### Session rows contain
- `session_id`
- `device_id`
- `started_at`
- `last_activity_at`

## Key Constraint: What This Product Is Not
Phase bugün şu şeyleri doğal olarak desteklemiyor:

- arbitrary metrics + dimensions query composer
- event params bazlı generic filter/group-by
- attribution / acquisition reporting
- user identity graph
- cohorts / retention / LTV
- funnels
- path exploration
- warehouse-grade raw export surface
- GA-style universal analytics query engine

Bu nedenle ürün, olmayan yetenekleri API contract’ında ima etmeyecek.

---

## Goals

### Primary Goals
1. Kullanıcıya kendi app verisi için güvenli, token tabanlı, read-only programatik erişim vermek.
2. Phase’in bugün gerçekten desteklediği analytics capability’lerini dış dünyaya düzgün bir contract ile açmak.
3. Public API’yi self-describing yapmak; client’lar capability metadata endpoint’i üzerinden neyin desteklendiğini öğrenebilmeli.
4. Dashboard dışı entegrasyonlar için curated reports, limited raw entities ve realtime yüzeyi sağlamak.
5. SDK ingestion key ile public read access’i tamamen ayırmak.

### Secondary Goals
1. Frontend dashboard içinden token management ve quickstart sunmak.
2. Docs portalında Public API için resmi dökümantasyon sağlamak.
3. Batch querying ile dış client’ın birden fazla dashboard kartını tek istekte çekmesini sağlamak.

## Non-Goals
1. GA parity sağlamak.
2. Generic SQL-like analytics language tasarlamak.
3. Event params’ları first-class custom dimensions gibi queryable hale getirmek.
4. Raw data export ürününü çözmek.
5. Cross-app token yönetimi veya organization-level access modeli kurmak.
6. V1’de OAuth client credential flow sunmak.
7. V1’de webhook/embedded analytics/warehouse sync çözmek.

---

## Product Principles
1. **Capability-driven, not imagination-driven**
   - API yalnızca gerçekten desteklenen query’leri expose edecek.
2. **Read-only by design**
   - Public API hiçbir write surface açmayacak.
3. **App-scoped credentials**
   - Token tek app’e bağlı olacak.
4. **Semantics over mimicry**
   - `device` değerleri `user` gibi yeniden adlandırılmayacak.
5. **Metadata-first integration**
   - Client’lar desteklenen ölçüleri önce keşfedebilmeli.
6. **Guardrails over unlimited flexibility**
   - Page size, date range, breakdown limit, batch size, rate limits kontrollü olacak.

---

## Target Users

### 1. Developer / Integrator
Kendi backend service’inden Phase verisini çekmek istiyor.

### 2. BI / Data Consumer
PowerBI, Retool, internal dashboards veya custom reporting tool’a veri bağlamak istiyor.

### 3. Product / Growth Team
Public docs ve örnek curl ile hızlı rapor çekmek istiyor.

### 4. Partner / Agency
Belirli app için read-only access ile rapor üretmek istiyor.

---

## Proposed Product Surface

## Namespace and Versioning
Public API aşağıdaki namespace altında yayınlanacak:

`/public-api/v1`

Gerekçe:
- mevcut `/public` namespace waitlist/public marketing use-case’ine ayrılmış durumda,
- yeni surface doğrudan public access olsa da analytics odaklı ve versioned olmalı.

## Authentication Model

### Credential Type
- **Public Read Token**
- bearer token
- app-scoped
- read-only
- scope taşıyan credential

### Why Not Reuse SDK Key?
SDK key şu an write/ingestion için kullanılıyor. Aynı credential’ı read API’de kullanmak:
- güvenlik modelini bulanıklaştırır,
- privilege separation’ı bozar,
- abuse ve rotation yönetimini zorlaştırır.

### Token Properties
- yalnız hash olarak saklanır,
- create sırasında plain token bir kere gösterilir,
- revoke edilebilir,
- opsiyonel expiry destekler,
- son kullanım zamanı tutulur,
- scopes içerir.

### Proposed Scopes
- `reports:read`
- `events:read`
- `sessions:read`
- `devices:read`
- `realtime:read`

V1’de minimum gerekli scope setiyle başlanmalı; scope’lar endpoint ailesi bazında doğrulanmalı.

---

## API Families

## 1. Capabilities Metadata
### Endpoint
`GET /public-api/v1/apps/:appId/capabilities`

### Purpose
Client’ın bu app için hangi endpoint ailelerinin, metric’lerin, dimensions’ların ve filters’ların desteklendiğini öğrenmesi.

### Example Payload Shape
```json
{
  "appId": "123456789012345",
  "identityModel": "device",
  "retention": {
    "eventsDaysApprox": 365
  },
  "semantics": {
    "bounceRate": "sessions with duration < 10 seconds",
    "onlineDevicesWindowSeconds": 20,
    "activeDevicesWindowSeconds": 60,
    "consistency": "eventual"
  },
  "domains": {
    "events": {
      "reports": ["overview", "timeseries", "breakdown"],
      "metrics": ["eventCount"],
      "dimensions": ["eventName", "screenName", "date"],
      "filters": ["startDate", "endDate", "sessionId", "deviceId", "eventName"]
    },
    "sessions": {
      "reports": ["overview", "timeseries"],
      "metrics": ["sessionCount", "avgSessionDuration", "bounceRate", "activeSessions24h"],
      "dimensions": ["date"],
      "filters": ["startDate", "endDate", "deviceId"]
    },
    "devices": {
      "reports": ["overview", "timeseries", "breakdown"],
      "metrics": ["deviceCount", "activeDevices", "activeNow60s"],
      "dimensions": ["platform", "country", "city", "date"],
      "filters": ["startDate", "endDate", "platform", "properties"]
    },
    "realtime": {
      "reports": ["snapshot", "stream"],
      "metrics": ["onlineDevices20s", "activeDevices60s"]
    }
  }
}
```

## 2. Reports API
### Events
- `GET /public-api/v1/apps/:appId/reports/events/overview`
- `GET /public-api/v1/apps/:appId/reports/events/timeseries?startDate=...&endDate=...&interval=day`
- `GET /public-api/v1/apps/:appId/reports/events/breakdown?dimension=eventName|screenName&metric=eventCount&startDate=...&endDate=...&limit=...`

### Sessions
- `GET /public-api/v1/apps/:appId/reports/sessions/overview`
- `GET /public-api/v1/apps/:appId/reports/sessions/timeseries?metric=sessionCount|avgSessionDuration|bounceRate&startDate=...&endDate=...&interval=day`

### Devices
- `GET /public-api/v1/apps/:appId/reports/devices/overview`
- `GET /public-api/v1/apps/:appId/reports/devices/timeseries?metric=activeDevices|totalDevices&startDate=...&endDate=...&interval=day`
- `GET /public-api/v1/apps/:appId/reports/devices/breakdown?dimension=platform|country|city&metric=deviceCount&limit=...`

## 3. Raw Resource API
- `GET /public-api/v1/apps/:appId/events`
- `GET /public-api/v1/apps/:appId/events/:eventId`
- `GET /public-api/v1/apps/:appId/sessions`
- `GET /public-api/v1/apps/:appId/devices`
- `GET /public-api/v1/apps/:appId/devices/:deviceId`
- `GET /public-api/v1/apps/:appId/devices/:deviceId/activity`

Bu resource aileleri debug/integration amaçlıdır; ürünün ana yüzeyi report endpoints olacaktır.

## 4. Batch API
- `POST /public-api/v1/apps/:appId/reports/batch`
- max 5 child request
- tüm child request’ler aynı app için
- unsupported combinations request validation aşamasında reddedilir

## 5. Realtime API
- `GET /public-api/v1/apps/:appId/realtime/snapshot`
- `GET /public-api/v1/apps/:appId/realtime/stream`

---

## Supported Capability Matrix

## Events
| Surface | Supported | Notes |
| --- | --- | --- |
| Overview | Yes | `totalEvents`, `events24h`, 24h change values |
| Timeseries | Yes | yalnız günlük `eventCount` |
| Breakdown | Yes | `dimension=eventName` veya `screenName`, `metric=eventCount` |
| List | Yes | `eventName`, `sessionId`, `deviceId`, `startDate`, `endDate`, pagination |
| Detail | Yes | full event detail, params included |
| Param filtering | No | `params` string tutuluyor, V1 query surface yok |
| Country/platform breakdown | No | event row’da bu alanlar yok |

### Event filters
- `startDate`
- `endDate`
- `eventName`
- `sessionId`
- `deviceId`

### Event metrics
- `eventCount`

### Event dimensions
- `eventName`
- `screenName`
- `date`

## Sessions
| Surface | Supported | Notes |
| --- | --- | --- |
| Overview | Yes | `totalSessions`, `averageSessionDuration`, `activeSessions24h`, `bounceRate`, change values |
| Timeseries | Yes | `sessionCount`, `avgSessionDuration`, `bounceRate` |
| List | Yes | `deviceId`, `startDate`, `endDate`, pagination |
| Breakdown | No (V1) | current backend generic breakdown engine sunmuyor |
| Detail | No dedicated endpoint in V1 | list + device activity ile ihtiyaç karşılanacak |

### Session filters
- `startDate`
- `endDate`
- `deviceId`

### Session metrics
- `sessionCount`
- `avgSessionDuration`
- `bounceRate`
- `activeSessions24h`

### Session dimensions
- `date`

## Devices
| Surface | Supported | Notes |
| --- | --- | --- |
| Overview | Yes | `totalDevices`, `activeDevices24h`, platform/country/city stats |
| Timeseries | Yes | `activeDevices`, `totalDevices` |
| Breakdown | Yes | `platform`, `country`, `city` |
| List | Yes | `platform`, `properties`, `startDate`, `endDate`, pagination |
| Detail | Yes | device metadata + last activity |
| Activity | Yes | per-device session count timeseries |

### Device filters
- `startDate`
- `endDate`
- `platform`
- `properties` (base64 encoded JSON filter array)

### Device metrics
- `deviceCount`
- `activeDevices`
- `activeDevices24h`
- `activeDevices60s`
- `totalDevices`

### Device dimensions
- `platform`
- `country`
- `city`
- `date`

## Realtime
| Surface | Supported | Notes |
| --- | --- | --- |
| Snapshot | Yes | online/active counts + recent entities |
| Stream | Yes | SSE |
| Arbitrary realtime query | No | GA realtime report parity yok |

### Realtime semantics
- `onlineDevices20s`: son 20 saniyede aktivite görmüş distinct device sayısı
- `activeDevices60s`: son 60 saniyede aktivite görmüş distinct device sayısı

---

## Semantic Rules

### Identity Model
Phase public API V1’de primary analytics identity:
- **device**

Bu nedenle:
- `activeUsers` gibi terimler kullanılmayacak,
- gerekiyorsa `activeDevices` / `totalDevices` isimleri tercih edilecek,
- response metadata içinde `identityModel=device` belirtilecek.

### Bounce Rate Definition
Bounce rate şu şekilde tanımlanacak:
- session duration `< 10 seconds`

Bu bilgi hem docs’ta hem response metadata’da açıkça yer almalı.

### Freshness and Consistency
Event ingestion pipeline Redis buffer + QuestDB flush kullandığı için public API verisi:
- strictly real-time garanti etmez,
- eventual consistency taşır.

Bu nedenle response’lara aşağıdaki gibi meta alanları eklenmeli:

```json
{
  "meta": {
    "generatedAt": "2026-04-06T12:00:00.000Z",
    "consistency": "eventual",
    "identityModel": "device"
  }
}
```

### Retention
Event tarafında pratik retention yaklaşık 1 yıl olarak dokümante edilmeli. Bu bir ürün sözleşmesi yerine “current retention behavior” olarak ifade edilmeli.

---

## Pagination Strategy

### Resource Lists
V1’de mevcut backend yapısını yeniden kullanmak için resource list endpoint’leri:
- `page`
- `pageSize`

ile çalışacak.

### Guardrails
- default page size: 10 veya 25
- max page size: public API için kontrollü değer (öneri: 100, ama internal validator ile uyumlu karar verilmeli)
- raw list endpoint’leri bulk export ürünü gibi davranmamalı

### Reports
- overview/timeseries endpoint’lerinde pagination yok
- breakdown endpoint’lerinde `limit` kullanılacak

### Not for V1
- cursor pagination
- export jobs
- async report runs

Bunlar V1.5+ konuları olarak bırakılmalı.

---

## Rate Limiting and Quota

## V1 Strategy
V1’de GA benzeri weighted query-cost modeli yerine iki katmanlı koruma yeterlidir:

1. **Request Rate Limit**
   - token + IP bazlı
   - Redis-backed
   - response header’larında limit bilgisi döner

2. **Hard Query Guardrails**
   - max date range
   - max page size
   - max breakdown limit
   - max batch size
   - unsupported dimension/metric combinations rejected

## Suggested Initial Guardrails
- breakdown limit: max 50
- batch size: max 5
- report date range: max 90 gün
- raw list page size: conservative upper bound
- realtime stream: per-token düşük concurrent connection sınırı

## Response Headers
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- optional future:
  - `X-Phase-Quota-Day-Limit`
  - `X-Phase-Quota-Day-Remaining`

---

## Security and Privacy Requirements
1. Public API token’ları hash olarak saklanmalı.
2. Token create sonrası secret yeniden gösterilmemeli.
3. Revoked/expired token’lar anında reddedilmeli.
4. Scope bazlı endpoint erişimi uygulanmalı.
5. No sensitive logging: secret, raw token ve excessive params log’lanmamalı.
6. SSE stream auth da aynı token modeliyle korunmalı.
7. Public docs ve response’larda Phase’in `device != user` semantiği net olmalı.

---

## Dashboard Requirements
Public API ürününün tam olması için dashboard tarafında aşağıdakiler bulunmalı:

1. Token list view
2. Token create dialog
3. Scope selection
4. Optional expiry selection
5. Plain token reveal once + copy
6. Revoke flow
7. Capability summary card
8. Quickstart curl snippet
9. Docs CTA
10. Owner-only guard for secret actions

---

## Documentation Requirements
Docs en az şu sayfaları içermeli:
- Overview
- Authentication
- Capabilities
- Reports
- Resources
- Realtime
- Errors and rate limits
- Examples

---

## Success Criteria
### Launch Success
- App owner dashboard’dan public read token oluşturabiliyor.
- Token ile en az bir events, sessions, devices ve realtime endpoint’i başarılı çağrılabiliyor.
- Docs’ta verilen örnek curl’ler staging’de çalışıyor.

### Product Success
- Entegrasyon kurmak için dashboard dışı çözüm gerekmiyor.
- External consumer, docs ve capabilities endpoint’i ile desteklenen raporları anlayabiliyor.
- Public API ile GA parity beklentisi yerine doğru Phase capability beklentisi kuruluyor.

---

## Rollout Plan

### Phase 1 — Internal/Hidden Beta
- DB model + auth + management endpoints
- capabilities endpoint
- events/sessions/devices overview & timeseries
- token create/revoke
- private docs

### Phase 2 — Beta
- resource list endpoints
- breakdown endpoints
- batch endpoint
- realtime snapshot
- selected customers ile smoke test

### Phase 3 — Public v1
- realtime stream
- polished docs
- usage guidance + guardrails
- observability dashboards

### Phase 4 — Post-v1 Evaluation
- session/device breakdown expansion
- cursor pagination
- query-cost quotas
- selected custom dimensions roadmap

---

## Risks
1. Kullanıcılar GA benzeri serbest query beklentisi kurabilir.
2. `device` bazlı metrikler `user` olarak yanlış yorumlanabilir.
3. Event params queryability olmadığı için “custom dimension” beklentisi karşılanamaz.
4. Raw lists abuse edilirse API export endpoint’i gibi kullanılabilir.
5. Realtime semantics net anlatılmazsa 20s/60s pencereleri karışır.

---

## Open Questions
1. Public read token create/revoke yalnız owner’a mı açık olmalı?
2. Dashboard member’ları token list metadata’sını görebilmeli mi?
3. Public API docs tamamen açık mı olacak, yoksa dashboard quickstart öncelikli mi?
4. V1’de raw sessions detail endpoint gerekli mi, yoksa sessions list yeterli mi?
5. Public API için external SDK/client package üretilecek mi, yoksa docs + curl ile mi başlanacak?

---

## Explicit Out of Scope for V1
- freeform `runReport` with arbitrary metric/dimension pairs
- event param breakdowns
- source/medium/campaign analytics
- funnel analytics
- retention analytics
- cohort analytics
- warehouse exports
- OAuth app integrations
- organization-wide service accounts

---

## Final Product Decision
Phase Public Analytics API v1, **GA benzeri bir general-purpose analytics query engine değil; mevcut backend capability’leri üzerine kurulu, curated, self-describing, read-only bir analytics access layer** olacaktır.

Bu karar, Phase’in bugünkü mimarisiyle uyumlu, güvenli ve dürüst bir ürün yüzeyi sağlar.
