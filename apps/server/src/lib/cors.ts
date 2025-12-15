import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';

const getCorsOrigins = () => {
  const webUrl = process.env.WEB_URL || 'http://localhost:3002';
  const origins = [webUrl];

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3002', 'http://127.0.0.1:3002');
  }

  return [...new Set(origins.filter(Boolean))];
};

const corsOrigins = getCorsOrigins();

export const sdkCors = new Elysia({ name: 'sdk-cors' }).use(
  cors({
    origin: '*',
    methods: ['POST', 'GET', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: false,
  })
);

export const webCors = new Elysia({ name: 'web-cors' }).use(
  cors({
    origin: corsOrigins,
    methods: ['POST', 'GET', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

export const authCors = new Elysia({ name: 'auth-cors' }).use(
  cors({
    origin: corsOrigins,
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'User-Agent',
      'Accept',
      'Accept-Language',
      'Content-Language',
    ],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);
