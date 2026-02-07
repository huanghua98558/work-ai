import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workbot'

const client = postgres(connectionString, { max: 1 })
export const db = drizzle(client)
