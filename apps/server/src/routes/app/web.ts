import {
  AddTeamMemberRequestSchema,
  AddTeamMemberResponseSchema,
  AppCreatedSchema,
  AppDetailResponseSchema,
  AppKeysResponseSchema,
  AppsListResponseSchema,
  AppTeamResponseSchema,
  CreateAppRequestSchema,
  CreatePublicApiTokenRequestSchema,
  CreatePublicApiTokenResponseSchema,
  ErrorCode,
  ErrorResponseSchema,
  HttpStatus,
  type PublicApiToken as PublicApiTokenResponse,
  PublicApiTokensResponseSchema,
  UpdateAppRequestSchema,
} from '@phase/shared';
import { eq, or, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { apps, db, publicApiTokens } from '@/db';
import { auth } from '@/lib/auth';
import {
  generateAppId,
  generateAppKey,
  generatePublicApiToken,
  generatePublicApiTokenId,
  getPublicApiTokenPrefix,
  hashPublicApiToken,
} from '@/lib/keys';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';

type AuthContext = { user: BetterAuthUser; session: BetterAuthSession };

const DEFAULT_PUBLIC_API_SCOPES = [
  'reports:read',
  'events:read',
  'sessions:read',
  'devices:read',
  'realtime:read',
] as const;

function serializePublicApiToken(
  token: typeof publicApiTokens.$inferSelect
): PublicApiTokenResponse {
  const now = Date.now();
  const isRevoked = Boolean(token.revokedAt);
  const isExpired = Boolean(
    token.expiresAt && token.expiresAt.getTime() <= now
  );

  let status: PublicApiTokenResponse['status'] = 'active';
  if (isRevoked) {
    status = 'revoked';
  } else if (isExpired) {
    status = 'expired';
  }

  return {
    id: token.id,
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    expiresAt: token.expiresAt?.toISOString() ?? null,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
    status,
  };
}

export const appWebRouter = new Elysia({ prefix: '/apps' })
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
  .post(
    '/',
    async (ctx) => {
      const { body, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const appId = generateAppId();
        const appKey = generateAppKey();

        const [newApp] = await db
          .insert(apps)
          .values({
            id: appId,
            userId: user.id,
            name: body.name,
            image: body.image ?? null,
            key: appKey,
          })
          .returning();

        set.status = HttpStatus.OK;
        return {
          id: newApp.id,
          name: newApp.name,
          image: newApp.image,
          createdAt: newApp.createdAt.toISOString(),
        };
      } catch (error) {
        console.error('[App.Create] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to create app',
        };
      }
    },
    {
      requireAuth: true,
      body: CreateAppRequestSchema,
      response: {
        200: AppCreatedSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .get(
    '/',
    async (ctx) => {
      const { user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const accessibleApps = await db.query.apps.findMany({
          where: or(
            eq(apps.userId, user.id),
            sql`${user.id} = ANY(${apps.memberIds})`
          ),
          columns: {
            id: true,
            name: true,
            userId: true,
          },
          orderBy: (appsTable, { desc }) => [desc(appsTable.createdAt)],
        });

        const appsWithRole = accessibleApps.map((app) => ({
          id: app.id,
          name: app.name,
          role:
            app.userId === user.id ? ('owner' as const) : ('member' as const),
        }));

        set.status = HttpStatus.OK;
        return {
          apps: appsWithRole,
        };
      } catch (error) {
        console.error('[App.List] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to list apps',
        };
      }
    },
    {
      requireAuth: true,
      response: {
        200: AppsListResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:id',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        const hasAccess =
          app.userId === user.id || app.memberIds?.includes(user.id);

        if (!hasAccess) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Access denied',
          };
        }

        const role = app.userId === user.id ? 'owner' : 'member';

        set.status = HttpStatus.OK;
        return {
          id: app.id,
          name: app.name,
          image: app.image,
          createdAt: app.createdAt.toISOString(),
          role,
        };
      } catch (error) {
        console.error('[App.Get] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to get app details',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: AppDetailResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .get(
    '/:id/keys',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        const hasAccess =
          app.userId === user.id || app.memberIds?.includes(user.id);

        if (!hasAccess) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Access denied',
          };
        }

        set.status = HttpStatus.OK;
        return {
          key: app.key,
          keyRotatedAt: app.keyRotatedAt?.toISOString() ?? null,
        };
      } catch (error) {
        console.error('[App.GetKeys] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to get app keys',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: AppKeysResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )
  .get(
    '/:id/team',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        const hasAccess =
          app.userId === user.id || app.memberIds?.includes(user.id);

        if (!hasAccess) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Access denied',
          };
        }

        const owner = await db.query.user.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, app.userId),
          columns: {
            id: true,
            email: true,
            name: true,
          },
        });

        if (!owner) {
          set.status = HttpStatus.INTERNAL_SERVER_ERROR;
          return {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            detail: 'Owner not found',
          };
        }

        const memberUsers = await db.query.user.findMany({
          where: (table, { inArray }) => inArray(table.id, app.memberIds || []),
          columns: {
            id: true,
            email: true,
            name: true,
          },
        });

        set.status = HttpStatus.OK;
        return {
          owner: {
            userId: owner.id,
            email: owner.email,
            name: owner.name,
          },
          members: memberUsers.map((member) => ({
            userId: member.id,
            email: member.email,
            name: member.name,
          })),
        };
      } catch (error) {
        console.error('[App.GetTeam] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to get app team',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: AppTeamResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .get(
    '/:id/public-api/tokens',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        const hasAccess =
          app.userId === user.id || app.memberIds?.includes(user.id);

        if (!hasAccess) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Access denied',
          };
        }

        const tokens = await db.query.publicApiTokens.findMany({
          where: (table, { eq: eqFn }) => eqFn(table.appId, params.id),
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        });

        set.status = HttpStatus.OK;
        return {
          tokens: tokens.map(serializePublicApiToken),
        };
      } catch (error) {
        console.error('[App.ListPublicApiTokens] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to list API keys',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: PublicApiTokensResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .post(
    '/:id/public-api/tokens',
    async (ctx) => {
      const { params, body, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can create API keys',
          };
        }

        const token = generatePublicApiToken();
        const tokenId = generatePublicApiTokenId();
        const tokenHash = hashPublicApiToken(token);
        const tokenPrefix = getPublicApiTokenPrefix(token);
        const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

        const [createdToken] = await db
          .insert(publicApiTokens)
          .values({
            id: tokenId,
            appId: params.id,
            createdByUserId: user.id,
            name: body.name,
            tokenHash,
            tokenPrefix,
            scopes: [...DEFAULT_PUBLIC_API_SCOPES],
            expiresAt,
          })
          .returning();

        set.status = HttpStatus.CREATED;
        return {
          ...serializePublicApiToken(createdToken),
          token,
        };
      } catch (error) {
        console.error('[App.CreatePublicApiToken] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to create API key',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      body: CreatePublicApiTokenRequestSchema,
      response: {
        201: CreatePublicApiTokenResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .delete(
    '/:id/public-api/tokens/:tokenId',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can revoke API keys',
          };
        }

        const existingToken = await db.query.publicApiTokens.findFirst({
          where: (table, { and: andFn, eq: eqFn }) =>
            andFn(eqFn(table.id, params.tokenId), eqFn(table.appId, params.id)),
        });

        if (!existingToken) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'API key not found',
          };
        }

        await db
          .update(publicApiTokens)
          .set({ revokedAt: new Date() })
          .where(eq(publicApiTokens.id, params.tokenId));

        set.status = HttpStatus.NO_CONTENT;
      } catch (error) {
        console.error('[App.RevokePublicApiToken] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to revoke API key',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
        tokenId: t.String(),
      }),
      response: {
        204: t.Void(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .delete(
    '/:id',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can delete the app',
          };
        }

        await db.delete(apps).where(eq(apps.id, params.id));

        set.status = HttpStatus.NO_CONTENT;
      } catch (error) {
        console.error('[App.Delete] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to delete app',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      response: {
        204: t.Void(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .patch(
    '/:id',
    async (ctx) => {
      const { params, body, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can update the app',
          };
        }

        const [updatedApp] = await db
          .update(apps)
          .set({ name: body.name })
          .where(eq(apps.id, params.id))
          .returning();

        set.status = HttpStatus.OK;
        return {
          id: updatedApp.id,
          name: updatedApp.name,
          image: updatedApp.image,
          createdAt: updatedApp.createdAt.toISOString(),
        };
      } catch (error) {
        console.error('[App.Update] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to update app',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      body: UpdateAppRequestSchema,
      response: {
        200: AppCreatedSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .post(
    '/:id/keys/rotate',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can rotate the API key',
          };
        }

        const newKey = generateAppKey();

        await db
          .update(apps)
          .set({ key: newKey, keyRotatedAt: new Date() })
          .where(eq(apps.id, params.id));

        set.status = HttpStatus.OK;
        return {
          key: newKey,
          keyRotatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[App.RotateKey] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to rotate app key',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: AppKeysResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .post(
    '/:id/team/members',
    async (ctx) => {
      const { params, body, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can add team members',
          };
        }

        const targetUser = await db.query.user.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.email, body.email),
          columns: {
            id: true,
            email: true,
          },
        });

        if (!targetUser) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'User not found',
          };
        }

        if (targetUser.id === app.userId) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.BAD_REQUEST,
            detail: 'User is already the app owner',
          };
        }

        if (app.memberIds?.includes(targetUser.id)) {
          set.status = HttpStatus.BAD_REQUEST;
          return {
            code: ErrorCode.BAD_REQUEST,
            detail: 'User is already a team member',
          };
        }

        const updatedMemberIds = [...(app.memberIds || []), targetUser.id];

        await db
          .update(apps)
          .set({ memberIds: updatedMemberIds })
          .where(eq(apps.id, params.id));

        set.status = HttpStatus.OK;
        return {
          userId: targetUser.id,
          email: targetUser.email,
        };
      } catch (error) {
        console.error('[App.AddTeamMember] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to add team member',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
      }),
      body: AddTeamMemberRequestSchema,
      response: {
        200: AddTeamMemberResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  )

  .delete(
    '/:id/team/members/:userId',
    async (ctx) => {
      const { params, user, set } = ctx as typeof ctx & AuthContext;
      try {
        if (!user?.id) {
          set.status = HttpStatus.UNAUTHORIZED;
          return {
            code: ErrorCode.UNAUTHORIZED,
            detail: 'User authentication required',
          };
        }

        const app = await db.query.apps.findFirst({
          where: (table, { eq: eqFn }) => eqFn(table.id, params.id),
        });

        if (!app) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'App not found',
          };
        }

        if (app.userId !== user.id) {
          set.status = HttpStatus.FORBIDDEN;
          return {
            code: ErrorCode.FORBIDDEN,
            detail: 'Only the app owner can remove team members',
          };
        }

        if (!app.memberIds?.includes(params.userId)) {
          set.status = HttpStatus.NOT_FOUND;
          return {
            code: ErrorCode.NOT_FOUND,
            detail: 'User is not a team member',
          };
        }

        const updatedMemberIds = app.memberIds.filter(
          (memberId) => memberId !== params.userId
        );

        await db
          .update(apps)
          .set({ memberIds: updatedMemberIds })
          .where(eq(apps.id, params.id));

        set.status = HttpStatus.NO_CONTENT;
      } catch (error) {
        console.error('[App.RemoveTeamMember] Error:', error);
        set.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          detail: 'Failed to remove team member',
        };
      }
    },
    {
      requireAuth: true,
      params: t.Object({
        id: t.String(),
        userId: t.String(),
      }),
      response: {
        204: t.Void(),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    }
  );
