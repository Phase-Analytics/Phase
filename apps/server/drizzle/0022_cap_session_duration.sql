UPDATE "sessions_analytics"
SET "last_activity_at" = "started_at" + INTERVAL '1 hour'
WHERE "last_activity_at" > "started_at" + INTERVAL '1 hour';
