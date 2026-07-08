export const EXPLORE_INSTRUCTIONS = `# Phase Query SQL

Write read-only SELECT queries against three virtual tables. App scoping is applied automatically.

## Tables

### events
- timestamp (timestamptz)
- user_id (text)
- name (text) — the event name (e.g. purchase, level_complete)
- params (text) — JSON string

QuestDB syntax for params:
- json_extract(params, '$.key')
- cast(json_extract(params, '$.price') as double)

### users
- user_id, platform, country, locale, model, os_version
- first_seen (timestamptz)
- properties (jsonb) — use properties->>'key'

### sessions
- session_id, user_id
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
- JOINs work across tables on user_id.
- Single statement only. No semicolons.

## Examples

Recent events:
SELECT timestamp, user_id, name AS event_name
FROM events
ORDER BY timestamp DESC
LIMIT 100

Top events:
SELECT name AS event_name, count(*) AS events
FROM events
GROUP BY name
ORDER BY events DESC
LIMIT 100

Purchases by platform:
SELECT u.platform, count(*) AS purchases
FROM events e
JOIN users u ON e.user_id = u.user_id
WHERE e.name = 'purchase'
GROUP BY u.platform
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
