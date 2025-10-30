import { Scalar } from '@scalar/hono-api-reference';

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI configuration needs flexible typing
export const configureOpenAPI = (app: any) => {
  app.doc('/openapi.json', () => ({
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'Telemetra API',
      description: 'Telemetra API documentation',
    },
    servers: [
      {
        url: 'https://api.Telemetra.dev',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'health',
        description: 'System health and status checks',
      },
      {
        name: 'auth',
        description: 'Authentication and authorization',
      },
      {
        name: 'profile',
        description: 'User profile management',
      },
      {
        name: 'filters',
        description: 'Filter management and operations',
      },
      {
        name: 'jobs',
        description: 'Job processing and status tracking',
      },
      {
        name: 'notifications',
        description: 'User notification preferences',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT token from Apple OAuth',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  }));

  app.get(
    '/docs',
    Scalar({
      theme: 'deepSpace',
      hideClientButton: true,
      layout: 'modern',
      showToolbar: 'never',
      _integration: 'hono',
      persistAuth: true,
      telemetry: false,
      sources: [
        { url: '/v1/openapi.json', title: 'API' },
        { url: '/v1/api/auth/open-api/generate-schema', title: 'Auth' },
      ],
    })
  );
};
