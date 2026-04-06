import { Elysia } from 'elysia';
import { publicApiReportsRouter } from './reports';

export const publicApiRouter = new Elysia().use(publicApiReportsRouter);

export { publicApiReportsRouter } from './reports';
