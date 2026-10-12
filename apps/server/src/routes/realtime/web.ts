import { ErrorCode, HttpStatus, type RealtimeMessage } from '@phase/shared';
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

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

const MAX_QUEUED_MESSAGES = 50;

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
      const { query, request, set, user } = ctx as typeof ctx & AuthContext;
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
          where: (table, { eq: eqFn }) => eqFn(table.id, query.appId),
          columns: {
            id: true,
            name: true,
            userId: true,
            memberIds: true,
          },
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          yield sse({
            event: 'error',
            data: {
              code: ErrorCode.NOT_FOUND,
              detail: 'App not found',
            },
          });
          return;
        }

        const hasAccess =
          app.userId === user.id || app.memberIds?.includes(user.id);

        if (!hasAccess) {
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
            appName: app.name,
            events: [],
            sessions: [],
            devices: [],
            linkClicks: [],
            onlineUsers,
          },
        });

        const messageQueue: RealtimeMessage[] = [];
        let closed = false;
        let wake: (() => void) | null = null;
        const notify = () => {
          wake?.();
          wake = null;
        };
        const close = () => {
          closed = true;
          notify();
        };

        request.signal.addEventListener('abort', close, { once: true });
        const cleanup = sseManager.addConnection(
          query.appId,
          (data) => {
            messageQueue.push(data);
            // A client that stops reading must not grow the queue unbounded.
            if (messageQueue.length > MAX_QUEUED_MESSAGES) {
              messageQueue.shift();
            }
            notify();
          },
          close
        );

        try {
          while (!closed) {
            const message = messageQueue.shift();
            if (message) {
              yield sse({ event: 'realtime', data: message });
              continue;
            }
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
          }
        } finally {
          closed = true;
          request.signal.removeEventListener('abort', close);
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
