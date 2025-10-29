import { z } from '@hono/zod-openapi';

export const errorResponseSchema = z.object({
  code: z.string(),
  detail: z.string(),
  meta: z.any().optional(),
});

export const errorResponses = {
  400: {
    description: 'Error',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  401: {
    description: 'Error',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
  500: {
    description: 'Error',
    content: {
      'application/json': {
        schema: errorResponseSchema,
      },
    },
  },
};
