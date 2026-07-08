import { Elysia } from 'elysia';
import { publicApiFunnelsRouter } from './funnels';
import { publicApiQueryRouter } from './query';
import { publicApiReportsRouter } from './reports';

export const publicApiRouter = new Elysia()
  .use(publicApiReportsRouter)
  .use(publicApiFunnelsRouter)
  .use(publicApiQueryRouter);

export { publicApiFunnelsRouter } from './funnels';
export { publicApiQueryRouter } from './query';
export { publicApiReportsRouter } from './reports';
