import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

let dbInstance: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (dbInstance) {
    return dbInstance
  }

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const queryClient = postgres(databaseUrl, {
    max: 5,
    prepare: false,
  })

  dbInstance = drizzle(queryClient)

  return dbInstance
}
