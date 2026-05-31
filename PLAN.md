# Link Tracking — Implementation Plan

Product: branded short links per Phase app (`?app=` scoped). Dashboard lives under sidebar group **LINK**.

**Out of scope (this project):** billing limits, public API, realtime SSE, SVG QR export, max-click expiration, tablet as a device platform, IP storage in any form.

---

## Locked product decisions

| Topic | Decision |
| --- | --- |
| Default URL | `https://phase.sh/l/{slug}` |
| Slug | User-defined, **globally unique** on `phase.sh/l/*` (URL has no app id) |
| Multi-domain | One link can be served on default host + multiple verified custom domains |
| App scope | All link rows keyed by `app_id`; permissions match existing app team rules |
| Expired / disabled | HTTP **404** |
| Bot / crawler | HTTP **404**, no click row |
| Device routing | `ios` \| `android` \| `others` (tablet → others) |
| UTM | **Model A** — separate DB columns, merged into destination on redirect |
| QR | PNG only, 512px, error correction **Q** |
| Analytics range | Shared global `?range=` (`AnalyticsTimeRangePicker`) |
| Unique visits | Privacy-first, no IP, no cookie banner; see [Unique visits](#unique-visits) |
| QuestDB | **Separate table** `link_clicks` (not `events_v2`) |

---

## Sidebar & routes

```
LINK
  Links     → /dashboard/links?app=
  Domains   → /dashboard/links/domains?app=

Link detail → /dashboard/links/[linkId]?app=
  Tabs: Overview | Analytics | Settings
```

Also wire: command palette (`header.tsx`), sidebar group (`sidebar.tsx`).

---

## Custom domains — one DNS record, no TXT

### Is TXT verification required?

**No.** A single **CNAME** is enough for both ownership and routing.

If someone can create `go.customer.com → CNAME → cname.phase.sh`, they control that DNS zone. That is the proof. No `_phase-verify` TXT unless we later need extra safety for apex domains (not MVP).

### What the customer does (only step)

```
go.customer.com   CNAME   cname.phase.sh
```

Optional UI copy: “Use any subdomain you control (`go`, `links`, `app`, …).”

### Verification flow (backend)

1. User adds `go.customer.com` in Domains UI.
2. Status: `pending`.
3. Worker/cron or “Verify” button: DNS lookup — CNAME chain must resolve to our expected target (`cname.phase.sh` or equivalent).
4. On success: `verified`. On failure: stay `pending` + show last check error.

### SSL — what you (Phase ops) must set up once

**Problem:** Dokploy’s domain tab only certs hostnames **you** add there. You will not add every customer domain manually. Customer CNAME alone does not give Dokploy/Let’s Encrypt a cert for `go.customer.com`.

**Solution:** Terminate TLS for customer hostnames at **Cloudflare** (in front of Hetzner/Dokploy), not on Dokploy per tenant.

Recommended: **Cloudflare SSL for SaaS** (Custom Hostnames) on the zone that owns `cname.phase.sh`:

1. Create origin: Dokploy app (e.g. `api.phase.sh` / `phase.sh`) — already works today.
2. Add fallback origin + CNAME target `cname.phase.sh` → your origin (orange-cloud proxied).
3. Enable **Custom Hostnames** so any customer domain CNAME’d to `cname.phase.sh` gets an edge certificate automatically.
4. Redirect service reads `Host` header → resolves `link_domains.hostname` → same slug routing as `phase.sh/l/{slug}`.

**You do not touch Caddy/Nginx/Traefik in the container.** Dokploy stays as-is for Phase’s own domains. Customer SSL is Cloudflare’s job.

**If SSL for SaaS is not enabled yet:** MVP can still ship default `phase.sh/l/{slug}` links; custom domains stay “pending” until CF custom hostnames are configured. Document ops checklist in deploy notes.

### Custom domain URL shape

Same path as default:

- `https://go.customer.com/{slug}` (host-based tenant + path slug)

`phase.sh/l/{slug}` remains the canonical default. Custom host serves the same slug namespace **per app** (slug still globally unique in DB to avoid collisions across apps on shared infra).

---

## Redirect handler (hot path)

Public routes (no session auth), rate-limited, Redis-cached link config:

| Request | Behavior |
| --- | --- |
| `GET phase.sh/l/:slug` | Resolve link |
| `GET {verified-host}/:slug` | Resolve via `Host` + slug |

**Resolution order**

1. Load link (+ domains, utm, device rules, `expires_at`, `disabled_at`) from cache/Postgres.
2. Missing / disabled / expired → **404**
3. `isbot(ua)` or prefetch headers or empty UA → **404** (no click)
4. Pick destination: device rule (`ios` / `android` / `others`) or default `destination_url`
5. Merge UTM query params (builder wins on duplicate keys)
6. Record click to QuestDB (humans only)
7. **302** to final URL

**Libraries**

- Bots: [`isbot`](https://github.com/omrilotan/isbot) on `User-Agent`
- Prefetch skip: `Sec-Purpose: prefetch`, `Purpose: prefetch`
- Device: `ua-parser-js` → map to `ios` \| `android` \| `others`

---

## UTM (model A)

Postgres columns on `links`:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (nullable)

At redirect:

```ts
finalUrl = mergeQuery(destinationUrl, utmColumns)
// duplicate keys: UTM columns override existing destination params
```

Dashboard: UTM builder only fills these fields; destination URL stays clean.

---

## Unique visits

**Constraints:** no IP storage, no cookie banner, align with Phase’s non-PII analytics stance.

**Approach:** cookieless visitor key per click (industry-acceptable for analytics without cross-site tracking):

```
visitor_key = sha256(
  link_id
  | calendar_day_utc          // e.g. 2026-05-31
  | os_family                 // from ua-parser, coarse
  | browser_family            // coarse
  | accept_language_normalized // first language tag only
)
```

- Store only `visitor_key` (hash) on each click row — not raw UA, not IP.
- **Total clicks** = `count()` in range.
- **Unique visits** = `count_distinct(visitor_key)` in range (same user same day ≈ one unique; resets daily — acceptable for MVP; document in UI tooltip).

No `Set-Cookie`. No fingerprint canvas/WebGL.

---

## QuestDB — separate table

Do **not** write link clicks to `events_v2`. Different shape, different queries, no SDK/explore confusion.

### Table: `link_clicks`

```sql
CREATE TABLE link_clicks (
  click_id VARCHAR,
  app_id SYMBOL INDEX,
  link_id SYMBOL INDEX,
  visitor_key SYMBOL,
  country_code SYMBOL,
  os SYMBOL,
  browser SYMBOL,
  platform SYMBOL,        -- ios | android | others
  referrer SYMBOL,
  domain_host SYMBOL,     -- phase.sh or go.customer.com
  timestamp TIMESTAMP
) TIMESTAMP(timestamp) PARTITION BY MONTH WAL;
```

- Ingest: dedicated small buffer/ILP writer (mirror `event-buffer` pattern, separate Redis key).
- Reads: link analytics API only — never mixed into explore catalog / activity feed unless we explicitly add later.

Geo: run existing GeoIP lookup at redirect time; store **country_code** only (same as analytics elsewhere).

---

## Postgres schema (Drizzle)

### `links`

| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| app_id | text FK → apps | |
| slug | text UNIQUE | global unique |
| destination_url | text | |
| utm_* | text nullable | five columns |
| device_ios_url | text nullable | |
| device_android_url | text nullable | |
| device_others_url | text nullable | fallback; null → destination_url |
| expires_at | timestamp nullable | |
| disabled_at | timestamp nullable | |
| created_at / updated_at | timestamp | |

### `link_domains`

| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| app_id | text FK | |
| hostname | text UNIQUE | e.g. `go.customer.com` |
| status | enum | pending \| verified \| failed |
| last_check_at | timestamp | |
| last_error | text nullable | |
| created_at | timestamp | |

### `link_domain_bindings`

| link_id | domain_id | composite PK |

---

## API surface (Elysia, authenticated web routes)

Prefix: `/links` (under existing web API + app access checks).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | List links (paginated) |
| POST | `/` | Create link |
| GET | `/:linkId` | Detail |
| PATCH | `/:linkId` | Update |
| DELETE | `/:linkId` | Delete |
| GET | `/slug-available` | `?slug=` check |
| GET | `/:linkId/analytics` | Aggregates + timeseries for `?range=` |
| GET | `/domains` | List domains |
| POST | `/domains` | Add domain (pending) |
| POST | `/domains/:id/verify` | DNS check |
| DELETE | `/domains/:id` | Remove |
| PATCH | `/:linkId/domains` | Set bound domain ids |

Public (separate router, high rate limit):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/l/:slug` | Redirect on `phase.sh` |
| GET | `/:slug` | Redirect on verified custom host (Host header) |

---

## Frontend structure

```
apps/web/src/
  app/dashboard/links/
    page.tsx                    # links table
    domains/page.tsx            # domains table + add wizard
    [linkId]/page.tsx           # detail tabs
  components/links/
    links-table.tsx
    create-link-dialog.tsx
    edit-link-dialog.tsx
    link-utm-fields.tsx
    link-device-routing-fields.tsx
    link-qr-card.tsx            # PNG download, 512px, EC Q
    link-analytics.tsx          # TimescaleChart + distribution cards
    domains-table.tsx
    add-domain-dialog.tsx
  lib/queries/
    use-links.ts
    use-link-domains.ts
    use-link-analytics.ts
```

Reuse: `DashboardPageHeader`, `RequireApp`, `Card`, `DataTable` / `data-table-server`, dialog patterns from `create-public-api-token-dialog`, `AnalyticsTimeRangePicker`, chart components from users/events pages.

---

## Implementation phases

### Phase 0 — Shell

- [ ] Sidebar LINK group (Links, Domains)
- [ ] Empty pages + headers + command menu entries
- [ ] `RequireApp` on all routes

### Phase 1 — Postgres + CRUD API

- [ ] Drizzle schema + migration
- [ ] Links CRUD + slug availability
- [ ] Domains CRUD + CNAME verify job
- [ ] Link ↔ domain bindings

### Phase 2 — Redirect + clicks

- [ ] Public redirect routes
- [ ] Redis link config cache
- [ ] Bot / expire / disable → 404
- [ ] Device routing + UTM merge
- [ ] `link_clicks` QuestDB table + ingest buffer
- [ ] `visitor_key` generation (no IP)

### Phase 3 — Links UI

- [ ] Links table + create/edit dialogs
- [ ] Copy URL (default + per-domain)
- [ ] Disable + expiry date picker

### Phase 4 — Domains UI

- [ ] Domains table
- [ ] Add domain: single CNAME instruction + verify
- [ ] Attach domains on link form

### Phase 5 — Analytics UI

- [ ] Link detail Analytics tab
- [ ] Metrics: total clicks, unique visits, timeseries
- [ ] Breakdowns: country, OS, browser, referrer, platform
- [ ] Global `?range=` integration

### Phase 6 — QR

- [ ] PNG preview + download (512px, EC level Q)
- [ ] URL reflects selected domain or default

### Phase 7 — Ops (parallel / before custom domains go live)

- [ ] Cloudflare Custom Hostnames / SSL for SaaS on `cname.phase.sh`
- [ ] Document customer CNAME target in Domains UI

---

## Open ops checklist (Berky)

1. Confirm Cloudflare plan supports Custom Hostnames (or equivalent).
2. Create `cname.phase.sh` → Dokploy origin (proxied).
3. Test: random subdomain CNAME → cert issued → `Host` reaches app.
4. Env vars: `LINK_CNAME_TARGET=cname.phase.sh`, `LINK_DEFAULT_HOST=phase.sh`.

---

## Testing notes

- Redirect: expired, disabled, bot UA, ios/android/others UA snapshots
- UTM merge: destination pre-filled params vs builder override
- Slug global uniqueness across two apps
- Domain verify: wrong CNAME, correct CNAME, already-bound hostname
- Analytics: range param, unique vs total, no rows for bot 404s
- QuestDB: clicks never appear in SDK event queries

---

## References

- Bot detection: https://github.com/omrilotan/isbot
- Cloudflare SSL for SaaS: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
