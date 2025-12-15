import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  ...(process.env.POSTGRES_PASSWORD && {
    dbCredentials: {
      url: `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@postgres:5432/phase`,
    },
  }),
});
