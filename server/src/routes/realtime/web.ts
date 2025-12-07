import { or, sql } from 'drizzle-orm';
import { Elysia, sse, t } from 'elysia';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';
import { getOnlineUsers } from '@/lib/online-tracker';
import { sseManager } from '@/lib/sse-manager';
import { ErrorCode, HttpStatus, type RealtimeMessage } from '@/schemas';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

export const realtimeWebRouter = new Elysia({ prefix: '/realtime' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      user: session?.user as BetterAuthUser,
      session: session?.session as BetterAuthSession,
    };
  })
  .use(authPlugin)
  .get(
    '/stream',
    async function* (ctx) {
      const { query, set, user } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          yield sse({
            event: 'error',
            data: {
              code: ErrorCode.UNAUTHORIZED,
              detail: 'User authentication required',
            },
          });
          return;
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) =>
            or(
              eqFn(table.userId, user.id),
              sql`${user.id} = ANY(${table.memberIds})`
            ),
          columns: {
            id: true,
          },
        });

        if (!app || app.id !== query.appId) {
          set.status = HttpStatus.FORBIDDEN;
          yield sse({
            event: 'error',
            data: {
              code: ErrorCode.FORBIDDEN,
              detail: 'You do not have permission to access this app',
            },
          });
          return;
        }

        const onlineUsers = await getOnlineUsers(query.appId);
        sseManager.setOnlineUsers(query.appId, onlineUsers);

        yield sse({
          event: 'connected',
          data: {
            timestamp: new Date().toISOString(),
            events: [],
            sessions: [],
            devices: [],
            onlineUsers,
          },
        });

        const messageQueue: RealtimeMessage[] = [];
        let isConnected = true;

        const cleanup = sseManager.addConnection(query.appId, (data) => {
          if (isConnected) {
            messageQueue.push(data);
          }
        });

        try {
          while (isConnected) {
            if (messageQueue.length > 0) {
              const message = messageQueue.shift();
              if (message) {
                yield sse({
                  event: 'realtime',
                  data: message,
                });
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } finally {
          isConnected = false;
          cleanup();
        }
      } catch (error) {
        console.error('[Realtime.Stream] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        yield sse({
          event: 'error',
          data: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            detail: 'Failed to establish realtime stream',
          },
        });
      }
    },
    {
      query: t.Object({
        appId: t.String(),
      }),
    }
  );
