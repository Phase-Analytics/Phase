import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import {
  HttpStatus,
  WaitlistCountResponseSchema,
  WaitlistJoinBodySchema,
  WaitlistJoinResponseSchema,
} from '@phase/shared';
import { count, eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { db, waitlist } from '@/db';
import { getClientIp, getSocketAddress } from '@/lib/client-ip';
import {
  checkWaitlistRateLimit,
  RATE_LIMIT_STRATEGIES,
} from '@/lib/rate-limit';

const SECRET_RAW = process.env.BETTER_AUTH_SECRET;
if (!SECRET_RAW) {
  throw new Error('BETTER_AUTH_SECRET environment variable is not set');
}
const SECRET: string = SECRET_RAW;
const KEY = createHash('sha256').update(SECRET).digest();

function hashEmail(email: string): string {
  return createHash('sha256').update(SECRET).update(email).digest('hex');
}

function encryptEmail(email: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(email, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function generateId(): string {
  return crypto.randomUUID();
}

export const waitlistPublicRouter = new Elysia({ prefix: '/waitlist' })
  .post(
    '/',
    async ({ body, request, set, server }) => {
      const ip = getClientIp(request, getSocketAddress(request, server));

      if (ip) {
        const rateLimitResult = await checkWaitlistRateLimit(ip);
        const limit = RATE_LIMIT_STRATEGIES.WAITLIST.maxAttempts;

        set.headers['X-RateLimit-Limit'] = String(limit);
        set.headers['X-RateLimit-Remaining'] = String(
          rateLimitResult.remaining ?? 0
        );

        if (rateLimitResult.resetAt) {
          set.headers['X-RateLimit-Reset'] = String(
            Math.floor(rateLimitResult.resetAt / 1000)
          );
        }

        if (!rateLimitResult.allowed) {
          if (rateLimitResult.resetAt) {
            const retryAfter = Math.ceil(
              (rateLimitResult.resetAt - Date.now()) / 1000
            );
            set.headers['Retry-After'] = String(Math.max(0, retryAfter));
          }

          set.status = HttpStatus.TOO_MANY_REQUESTS;
          return {
            success: false,
            message: 'Too many requests. Please try again later.',
          };
        }
      }

      const normalizedEmail = body.email.toLowerCase().trim();
      const emailHash = hashEmail(normalizedEmail);

      const existing = await db.query.waitlist.findFirst({
        where: eq(waitlist.emailHash, emailHash),
      });

      if (existing) {
        set.status = HttpStatus.OK;
        return {
          success: true,
          message: 'You are already on the waitlist!',
        };
      }

      await db.insert(waitlist).values({
        id: generateId(),
        emailHash,
        encryptedEmail: encryptEmail(normalizedEmail),
      });

      set.status = HttpStatus.CREATED;
      return {
        success: true,
        message: 'Successfully joined the waitlist!',
      };
    },
    {
      body: WaitlistJoinBodySchema,
      response: {
        200: WaitlistJoinResponseSchema,
        201: WaitlistJoinResponseSchema,
        429: WaitlistJoinResponseSchema,
      },
      detail: {
        summary: 'Join waitlist',
        description: 'Add email to the waitlist. Email is hashed for privacy.',
        tags: ['Waitlist'],
      },
    }
  )
  .get(
    '/count',
    async ({ set }) => {
      const result = await db.select({ count: count() }).from(waitlist);
      const totalCount = result[0]?.count ?? 0;

      set.status = HttpStatus.OK;
      return {
        count: totalCount,
      };
    },
    {
      response: {
        200: WaitlistCountResponseSchema,
      },
      detail: {
        summary: 'Get waitlist count',
        description: 'Get the total number of people on the waitlist',
        tags: ['Waitlist'],
      },
    }
  );
