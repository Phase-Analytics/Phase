DELETE FROM "sessions_analytics"
WHERE "last_activity_at" < NOW() - INTERVAL '10 minutes'
  AND EXTRACT(EPOCH FROM ("last_activity_at" - "started_at")) < 5;
