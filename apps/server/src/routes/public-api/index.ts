import { Elysia } from 'elysia';
import { publicApiMetaRouter } from './meta';
import { publicApiReportsRouter } from './reports';

export const publicApiRouter = new Elysia()
  .use(publicApiMetaRouter)
  .use(publicApiReportsRouter);

export { publicApiMetaRouter } from './meta';
export { publicApiReportsRouter } from './reports';
