import type { Config } from 'drizzle-kit'

export default {
  schema: './src/storage/database/shared/schema.ts',
  out: './drizzle',
  driver: 'pg' as any,
  dbCredentials: {
    connectionString: process.env.PGDATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workbot',
  },
} satisfies any
