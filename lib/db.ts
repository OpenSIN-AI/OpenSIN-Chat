import { Pool } from 'pg'
import { cookies } from 'next/headers'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

// Reuse a single pool across hot reloads in development.
export const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

const UID_COOKIE = 'oafd_uid'

/**
 * Returns a stable anonymous user id for the current browser, stored in an
 * httpOnly cookie. This scopes all workspaces/documents/messages per visitor
 * until real authentication is added.
 */
export async function getUserId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(UID_COOKIE)?.value
  if (existing) return existing

  const id = crypto.randomUUID()
  store.set(UID_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return id
}
