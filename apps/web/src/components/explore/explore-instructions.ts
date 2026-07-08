export const EXPLORE_INSTRUCTIONS = `# Phase Query SQL

Write read-only SELECT queries against three virtual tables. App scoping is applied automatically.

## Tables

### events
- timestamp (timestamptz)
- device_id (text)
- name (text) — event name
- params (text) — JSON string

QuestDB syntax for params:
- json_extract(params, '$.key')
- cast(json_extract(params, '$.price') as double)

### devices
- device_id, platform, country, city, locale, model, os_version
- first_seen (timestamptz)
- properties (jsonb) — use properties->>'key'

### sessions
- session_id, device_id
- started_at, last_activity_at (timestamptz)
- duration_seconds (number)

## Time range

- If your SQL does not filter on timestamp, started_at, last_activity_at, or first_seen, events and sessions are scoped to the last 30 days.
- Add your own time predicates in WHERE to control the range, for example:
  WHERE timestamp >= '2025-01-01'

## Pagination

- LIMIT sets page size (default 100 if omitted, max 1000 in the dashboard).
- Do not use OFFSET. Use the page controls in the UI.
- Deep pagination is capped at 100,000 skipped rows.
- Export downloads the current page only.

## Rules

- SELECT only. No mutations.
- Do not filter by app_id — it is injected automatically.
- Debug events are excluded automatically.
- JOINs work across tables on device_id.
- Single statement only. No semicolons.

## Examples

Top events:
SELECT name, count(*) AS count
FROM events
GROUP BY name
ORDER BY count DESC
LIMIT 100

Purchases by platform:
SELECT d.platform, count(*) AS purchases
FROM events e
JOIN devices d ON e.device_id = d.device_id
WHERE e.name = 'purchase'
GROUP BY d.platform
ORDER BY purchases DESC
LIMIT 50

Custom time range:
SELECT name, count(*) AS count
FROM events
WHERE timestamp >= '2025-06-01'
GROUP BY name
ORDER BY count DESC
LIMIT 100
`;
