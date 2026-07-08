import { Elysia } from 'elysia';
import { publicApiQueryRouter } from './query';
import { publicApiReportsRouter } from './reports';

export const publicApiRouter = new Elysia()
  .use(publicApiReportsRouter)
  .use(publicApiQueryRouter);

export { publicApiQueryRouter } from './query';
export { publicApiReportsRouter } from './reports';
