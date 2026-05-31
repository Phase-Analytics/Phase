import { and, eq, or, sql } from 'drizzle-orm';
import { apps, db } from '@/db';

export function assertAppAccess(appId: string, userId: string) {
  return db.query.apps.findFirst({
    where: and(
      eq(apps.id, appId),
      or(eq(apps.userId, userId), sql`${userId} = ANY(${apps.memberIds})`)
    ),
  });
}
