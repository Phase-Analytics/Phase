import { and, arrayContains, eq, or, type SQL } from 'drizzle-orm';
import { apps, db } from '@/db';

/**
 * Owner or team member. `member_ids @> ARRAY[user]` (unlike `user = ANY(...)`)
 * can use the apps_member_ids_idx GIN index.
 */
export function userCanAccessApp(userId: string): SQL {
  return or(
    eq(apps.userId, userId),
    arrayContains(apps.memberIds, [userId])
  ) as SQL;
}

export function findAccessibleApp(appId: string, userId: string) {
  return db.query.apps.findFirst({
    where: and(eq(apps.id, appId), userCanAccessApp(userId)),
  });
}
