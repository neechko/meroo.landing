/**
 * GET /api/views          → read the total
 * GET /api/views?hit=1    → increment once, then read
 *
 * The counter lives in a tiny public service (abacus.jasoncameron.dev) so the
 * site does not need a database. Reads are cached for a few seconds, which is
 * enough for a "live" badge without hammering the upstream API.
 */

const ABACUS = 'https://abacus.jasoncameron.dev'
const CACHE_MS = 8_000

let cache = { count: null, at: 0 }

export default async function handler(req, res) {
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
      const response = await fetch(
        `${ABACUS}/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const count = Number(data?.value ?? data?.count)
      if (!Number.isFinite(count)) throw new Error('Unexpected counter payload')
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
    const response = await fetch(
      `${ABACUS}/get/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      },
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const count = Number(data?.value ?? data?.count)
    if (!Number.isFinite(count)) throw new Error('Unexpected counter payload')
    cache = { count, at: Date.now() }
    return res.status(200).json({ count, updatedAt: Date.now() })
  } catch {
    if (cache.count != null && Date.now() - cache.at < 60_000) {
      return res.status(200).json({ count: cache.count, stale: true })
    }
    return res.status(200).json({ count: null, offline: true })
  }
}
