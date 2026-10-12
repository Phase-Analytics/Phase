import { ErrorCode, HttpStatus } from '@phase/shared';
import { Elysia } from 'elysia';
import { findAccessibleApp } from '@/lib/app-access';
import { auth } from '@/lib/auth';
import {
  authPlugin,
  type BetterAuthSession,
  type BetterAuthUser,
} from '@/lib/middleware';

export type LinksAuthContext = {
  user: BetterAuthUser | undefined;
  session: BetterAuthSession | undefined;
};

type ErrorBody = { code: string; detail: string };
type StatusSetter = { status?: number | string };

/** Base for the dashboard link routers: session derive + auth macros. */
export function createLinksRouter() {
  return new Elysia()
    .derive(async ({ request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return {
        user: session?.user as BetterAuthUser,
        session: session?.session as BetterAuthSession,
      };
    })
    .use(authPlugin);
}

export function respondError(
  set: StatusSetter,
  status: number,
  code: string,
  detail: string
): ErrorBody {
  set.status = status;
  return { code, detail };
}

/** Returns an error body (and sets the status) unless the user can access the app. */
export async function authorizeLinkApp(
  user: BetterAuthUser | undefined,
  appId: string,
  set: StatusSetter
): Promise<ErrorBody | null> {
  if (!user?.id) {
    return respondError(
      set,
      HttpStatus.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    );
  }

  const app = await findAccessibleApp(appId, user.id);
  if (!app) {
    return respondError(
      set,
      HttpStatus.FORBIDDEN,
      ErrorCode.FORBIDDEN,
      'Access denied'
    );
  }

  return null;
}

export function linkNotFound(set: StatusSetter): ErrorBody {
  return respondError(
    set,
    HttpStatus.NOT_FOUND,
    ErrorCode.NOT_FOUND,
    'Link not found'
  );
}
