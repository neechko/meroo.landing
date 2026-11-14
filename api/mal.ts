/**
 * GET /api/mal?username=meroo__&limit=6
 *
 * MyAnimeList does not send CORS headers on its public list endpoint, so the
 * browser cannot read it directly. This function fetches the "watching" list
 * server-side, trims it to what the HUD needs, and caches the response for a
 * couple of minutes. The username can also come from MAL_USERNAME.
 */

import type { ApiRequest, ApiResponse } from './_types.ts'

const MAL_BASE = 'https://myanimelist.net/animelist'
const REVALIDATE = 120

interface MalEntry {
  anime_id?: number
  anime_title?: string
  anime_title_eng?: string
  anime_image_path?: string
  image_url?: string
  num_watched_episodes?: number
  anime_num_episodes?: number
  score?: number
  anime_media_type_string?: string
  anime_airing_status?: number
  genres?: Array<{ name?: string }>
  updated_at?: number
  anime_url?: string
}

interface NormalizedEntry {
  id: number | undefined
  title: string
  image: string
  watched: number
  total: number
  score: number
  type: string
  airing: boolean
  genres: string[]
  updatedAt: number
  url: string
}

function normalize(entry: MalEntry): NormalizedEntry {
  const genres = Array.isArray(entry.genres)
    ? entry.genres.map((genre) => genre.name).filter((name): name is string => Boolean(name))
    : []
  const title = (entry.anime_title_eng || entry.anime_title || 'Untitled').trim()

  return {
    id: entry.anime_id,
    title,
    image: entry.anime_image_path || entry.image_url || '',
    watched: entry.num_watched_episodes ?? 0,
    total: entry.anime_num_episodes ?? 0,
    score: entry.score ?? 0,
    type: entry.anime_media_type_string || 'TV',
    airing: entry.anime_airing_status === 1,
    genres: genres.slice(0, 3),
    updatedAt: (entry.updated_at ?? 0) * 1000,
    url: entry.anime_url ? `https://myanimelist.net${entry.anime_url}` : '',
  }
}

function firstQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', `public, s-maxage=${REVALIDATE}, stale-while-revalidate=600`)

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const username = firstQueryValue(req.query?.username).trim() || (process.env.MAL_USERNAME ?? '').trim()
  const limit = Math.min(12, Math.max(1, Number.parseInt(firstQueryValue(req.query?.limit), 10) || 6))

  if (!/^[A-Za-z0-9_-]{2,32}$/.test(username)) {
    return res.status(400).json({
      error: 'No MyAnimeList username configured. Add one in src/config.js or set MAL_USERNAME.',
    })
  }

  try {
    const response = await fetch(
      `${MAL_BASE}/${encodeURIComponent(username)}/load.json?offset=0&status=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'meroo-landing/1.0 (https://github.com/neechko)',
        },
        signal: AbortSignal.timeout(9000),
      },
    )

    if (response.status === 400 || response.status === 404) {
      return res.status(404).json({ error: `MyAnimeList user "${username}" was not found.` })
    }

    if (!response.ok) {
      return res.status(502).json({ error: `MyAnimeList returned HTTP ${response.status}.` })
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      return res.status(502).json({ error: 'MyAnimeList returned an unexpected response.' })
    }

    const entries = (data as MalEntry[])
      .map(normalize)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)

    return res.status(200).json({
      username,
      entries,
      watching: data.length,
      fetchedAt: Date.now(),
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'MyAnimeList took too long to answer.'
        : 'Could not reach MyAnimeList.'
    return res.status(502).json({ error: message })
  }
}
