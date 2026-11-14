/**
 * GET /api/views          → read the total
 * GET /api/views?hit=1    → increment once, then read
 *
 * The counter lives in a tiny public service (abacus.jasoncameron.dev) so the
 * site does not need a database. Reads are cached for a few seconds, which is
 * enough for a "live" badge without hammering the upstream API.
 */

import type { ApiRequest, ApiResponse } from './_types.ts'

const ABACUS = 'https://abacus.jasoncameron.dev'
const CACHE_MS = 8_000

interface CounterCache {
  count: number | null
  at: number
}

interface CounterPayload {
  value?: unknown
  count?: unknown
}

let cache: CounterCache = { count: null, at: 0 }

async function readCount(url: string): Promise<number> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = (await response.json()) as CounterPayload | null
  const count = Number(data?.value ?? data?.count)
  if (!Number.isFinite(count)) throw new Error('Unexpected counter payload')
  return count
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const namespace = String(process.env.VIEWS_NAMESPACE ?? 'meroo-landing').trim()
  const key = String(process.env.VIEWS_KEY ?? 'site-views').trim()
  const hit = String(req.query?.hit ?? '') === '1'

  if (hit) {
    try {
      const count = await readCount(
        `${ABACUS}/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`,
      )
      cache = { count, at: Date.now() }
      return res.status(200).json({ count, hit: true, updatedAt: Date.now() })
    } catch {
      return res.status(200).json({ count: null, hit: true, offline: true })
    }
  }

  if (cache.count != null && Date.now() - cache.at < CACHE_MS) {
    return res.status(200).json({ count: cache.count, cached: true })
  }

  try {
    const count = await readCount(
      `${ABACUS}/get/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`,
    )
    cache = { count, at: Date.now() }
    return res.status(200).json({ count, updatedAt: Date.now() })
  } catch {
    if (cache.count != null && Date.now() - cache.at < 60_000) {
      return res.status(200).json({ count: cache.count, stale: true })
    }
    return res.status(200).json({ count: null, offline: true })
  }
}
