import { Scalar } from '@scalar/hono-api-reference';

// biome-ignore lint/suspicious/noExplicitAny: OpenAPI configuration needs flexible typing
export const configureOpenAPI = (app: any) => {
  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    description:
      'API Key for authentication. Use format: Bearer <your-api-key>',
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'CookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'better-auth.session_token',
    description: 'Session cookie for authenticated users (web frontend)',
  });

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'Telemetra API',
      description: 'Telemetra API documentation',
    },
    servers: [
      {
        url: 'https://api.telemetra.dev',
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
        name: 'activity',
        description: 'Unified activity timeline (events + errors)',
      },
      {
        name: 'device',
        description: 'Device management and operations',
      },
      {
        name: 'error',
        description: 'Error tracking and reporting',
      },
      {
        name: 'event',
        description: 'Event tracking and analytics',
      },
      {
        name: 'overview',
        description: 'Dashboard overview metrics and statistics',
      },
      {
        name: 'ping',
        description: 'Session ping/heartbeat for active session monitoring',
      },
      {
        name: 'session',
        description: 'Session tracking and management',
      },
    ],
  });

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
