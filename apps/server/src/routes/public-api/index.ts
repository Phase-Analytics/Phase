import { Elysia } from 'elysia';
import { publicApiQueryRouter } from './query';
import { publicApiReportsRouter } from './reports';

export const publicApiRouter = new Elysia()
  .use(publicApiReportsRouter)
  .use(publicApiQueryRouter);

export { publicApiReportsRouter } from './reports';
export { publicApiQueryRouter } from './query';
