import {
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  PublicPolicyResponseSchema,
} from '@phase/shared';
import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, policies } from '@/db';

function formatPolicyDate(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

export const policiesPublicRouter = new Elysia({ prefix: '/policies' }).get(
  '/:policyId',
  async ({ params, set }) => {
    const row = await db.query.policies.findFirst({
      where: eq(policies.id, params.policyId),
    });

    if (!row) {
      set.status = HttpStatus.NOT_FOUND;
      return { code: ErrorCode.NOT_FOUND, detail: 'Policy not found' };
    }

    const app = await db.query.apps.findFirst({
      where: eq(apps.id, row.appId),
      columns: { name: true },
    });

    return {
      id: row.id,
      name: row.name,
      date: formatPolicyDate(row.date),
      content: row.content,
      appName: app?.name ?? null,
    };
  },
  {
    params: t.Object({ policyId: t.String() }),
    response: {
      200: PublicPolicyResponseSchema,
      404: ErrorResponseSchema,
    },
  }
);
