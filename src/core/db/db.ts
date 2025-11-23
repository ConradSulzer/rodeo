import path from 'node:path'
import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'node:fs'
import * as schema from './schema'

export function migrationsPath() {
  const candidates = [
    // DEV: source folder
    path.resolve(process.cwd(), 'src/core/db/migrations'),
    // DEV alt: if running from compiled out/main
    path.resolve(process.cwd(), 'dist/core/db/migrations'),
    // PROD: packaged app resources (you’ll copy migrations here later)
    path.resolve(process.resourcesPath ?? process.cwd(), 'migrations')
  ]

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'meta', '_journal.json'))) return dir
  }

  throw new Error(
    `Drizzle migrations not found. Looked in:\n${candidates.join('\n')}\n` +
      `Did you run "npm run db:gen"?`
  )
}

export type AppDatabase = BetterSQLite3Database<typeof schema>

export type OpenDb = {
  db: AppDatabase
  close: () => void
}

export function openDb(filePath: string): OpenDb {
  const sqlite = new Database(filePath) // opens if exists, creates if not

  sqlite.pragma('foreign_keys = ON') // use foreign keys
  sqlite.pragma('journal_mode = WAL') // use .wal file and merge changes in later isntead of rewriting the file every trans
  sqlite.pragma('synchronous = NORMAL') // fsync less aggressively, but still don't corrupt on crash

  const db = drizzle(sqlite, { schema })

  migrate(db, { migrationsFolder: migrationsPath() }) // this is idempotent

  return {
    db,
    close: () => {
      try {
        sqlite.pragma('wal_checkpoint(TRUNCATE)')
      } catch (error) {
        console.warn('Failed to checkpoint WAL before closing DB', error)
      }
      sqlite.close()
    }
  }
}

// In memory sandbox DB for testing. Pass a callback that takes a DB arg and does something against that DB.
// This function will return the result of that operation.
export function withInMemoryDb<T>(fn: (db: AppDatabase) => T) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: migrationsPath() })
  try {
    return fn(db)
  } finally {
    sqlite.close()
  }
}
