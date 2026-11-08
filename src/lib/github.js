import { useCallback, useEffect, useState } from 'react'

const CACHE_TTL = 10 * 60 * 1000
const CACHE_PREFIX = 'meroo:github:'

// Stable defaults: a fresh {} or [] on every render would re-run the effect.
const NO_FEATURED = []
const NO_NOTES = {}

const ACCENTS = [
  'from-violet-500 via-fuchsia-500 to-pink-500',
  'from-sky-400 via-cyan-400 to-emerald-400',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-indigo-500 via-blue-500 to-cyan-400',
  'from-emerald-400 via-teal-400 to-cyan-400',
]

export const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  PHP: '#4f5d95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572a5',
  Java: '#b07219',
  'C#': '#178600',
  'C++': '#f34b7d',
  Go: '#00add8',
  Rust: '#dea584',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#000080',
  Ruby: '#701516',
}

function readCache(username) {
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${username}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.repos) || !parsed?.syncedAt) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(username, payload) {
  try {
    window.sessionStorage.setItem(`${CACHE_PREFIX}${username}`, JSON.stringify(payload))
  } catch {
    // Private mode or a full storage quota: caching is optional.
  }
}

function describe(repo, note) {
  if (note?.description) return note.description
  const description = (repo.description ?? '').trim()
  if (description.length > 8 && description !== '...') return description
  return 'No description on GitHub yet.'
}

/**
 * Public repositories from GitHub, newest first. Pinned names in `featured`
 * are moved to the front. Cached in sessionStorage so a normal visit only
 * costs one unauthenticated API request.
 */
export function useGithubRepos(
  username,
  { limit = 5, featured = NO_FEATURED, notes = NO_NOTES } = {},
) {
  const [repos, setRepos] = useState(() => readCache(username)?.repos ?? null)
  const [syncedAt, setSyncedAt] = useState(() => readCache(username)?.syncedAt ?? null)
  const [status, setStatus] = useState(() => (readCache(username) ? 'ready' : username ? 'loading' : 'error'))
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    if (!username) {
      setStatus('error')
      setError('No GitHub username configured.')
      return undefined
    }

    const cached = readCache(username)
    if (cached && Date.now() - cached.syncedAt < CACHE_TTL && nonce === 0) {
      setRepos(cached.repos)
      setSyncedAt(cached.syncedAt)
      setStatus('ready')
      setError(null)
      return undefined
    }

    let cancelled = false
    setStatus((current) => (current === 'ready' ? 'refreshing' : 'loading'))

    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 403 || response.status === 429
              ? 'GitHub rate limit reached.'
              : `GitHub returned HTTP ${response.status}.`,
          )
        }
        return response.json()
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return

        const rank = (repo) => {
          const index = featured.indexOf(repo.name)
          return index === -1 ? Number.MAX_SAFE_INTEGER : index
        }

        const mapped = data
          .filter((repo) => !repo.fork && !repo.archived && repo.name !== username)
          .sort((a, b) => rank(a) - rank(b) || new Date(b.pushed_at) - new Date(a.pushed_at))
          .slice(0, limit)
          .map((repo, index) => {
            const note = notes[repo.name] ?? {}
            return {
              title: repo.name,
              description: describe(repo, note),
              tags: note.tags ?? [repo.language, ...(repo.topics ?? [])].filter(Boolean).slice(0, 3),
              url: repo.html_url,
              homepage: repo.homepage || '',
              stars: repo.stargazers_count ?? 0,
              updatedAt: repo.pushed_at,
              language: repo.language || 'Code',
              languageColor: LANGUAGE_COLORS[repo.language] ?? '#a1a1aa',
              accent: note.accent ?? ACCENTS[index % ACCENTS.length],
              icon: 'github',
            }
          })

        if (!mapped.length) throw new Error('This GitHub account has no public repositories yet.')

        const synced = Date.now()
        setRepos(mapped)
        setSyncedAt(synced)
        setStatus('ready')
        setError(null)
        writeCache(username, { repos: mapped, syncedAt: synced })
      })
      .catch((cause) => {
        if (cancelled) return
        setError(cause.message)
        // Keep the previous list on screen when a refresh fails.
        setStatus((current) =>
          current === 'ready' || current === 'refreshing' ? 'stale' : 'error',
        )
      })

    return () => {
      cancelled = true
    }
  }, [username, limit, featured, notes, nonce])

  return { repos, status, error, syncedAt, refresh }
}
