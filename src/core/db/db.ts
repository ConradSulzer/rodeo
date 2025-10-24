import path from 'node:path'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export function migrationsPath() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  return path.resolve(__dirname, './migrations')
}

export type OpenDb = {
  db: BetterSQLite3Database
  close: () => void
}

export function openDb(filePath: string): OpenDb {
  const sqlite = new Database(filePath) // opens if exists, creates if not

  sqlite.pragma('foreign_keys = ON') // use foreign keys
  sqlite.pragma('journal_mode = WAL') // use .wal file and merge changes in later isntead of rewriting the file every trans
  sqlite.pragma('synchronous = NORMAL') // fsync less aggressively, but still don't corrupt on crash

  const db = drizzle(sqlite)

  migrate(db, { migrationsFolder: migrationsPath() }) // this is idempotent

  return {
    db,
    close: () => {
      try {
        sqlite.pragma('wal_checkpoint(TRUNCATE)')
      } catch {}
      sqlite.close()
    }
  }
}

// In memory sandbox DB for testing. Pass a callback that takes a DB arg and does something against that DB.
// This function will return the result of that operation.
export function withInMemoryDb<T>(fn: (db: ReturnType<typeof drizzle>) => T) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder: migrationsPath() })
  try {
    return fn(db)
  } finally {
    sqlite.close()
  }
}
