import { Elysia } from 'elysia';
import { linkAdminRouter } from './admin';
import { linkAnalyticsRouter } from './analytics';
import { linkCrudRouter } from './crud';
import { linkDomainsRouter } from './domains';
import { linkOgImageRouter } from './og-image';

/** Dashboard link API (`/web/links/*`). */
export const linksWebRouter = new Elysia({ prefix: '/links' })
  .use(linkDomainsRouter)
  .use(linkAdminRouter)
  .use(linkOgImageRouter)
  .use(linkAnalyticsRouter)
  .use(linkCrudRouter);
