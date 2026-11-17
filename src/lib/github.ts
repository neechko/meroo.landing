import { useCallback, useEffect, useState } from 'react'
import type { LoadStatus, Project, ProjectNote } from '../types'

const CACHE_TTL = 10 * 60 * 1000
const CACHE_PREFIX = 'meroo:github:'

// Stable defaults: a fresh {} or [] on every render would re-run the effect.
const NO_FEATURED: string[] = []
const NO_NOTES: Record<string, ProjectNote> = {}

const ACCENTS = [
  'from-violet-500 via-indigo-500 to-cyan-400',
  'from-sky-400 via-cyan-400 to-indigo-400',
  'from-indigo-400 via-violet-400 to-cyan-300',
  'from-indigo-500 via-blue-500 to-cyan-400',
  'from-cyan-400 via-sky-400 to-indigo-500',
]

export const LANGUAGE_COLORS: Record<string, string> = {
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

interface GithubRepo {
  name: string
  description?: string | null
  fork?: boolean
  archived?: boolean
  topics?: string[]
  language?: string | null
  html_url: string
  homepage?: string | null
  stargazers_count?: number
  pushed_at?: string
}

interface GithubCache {
  repos: Project[]
  syncedAt: number
}

function readCache(username: string): GithubCache | null {
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${username}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<GithubCache> | null
    if (!Array.isArray(parsed?.repos) || !parsed?.syncedAt) return null
    return parsed as GithubCache
  } catch {
    return null
  }
}

function writeCache(username: string, payload: GithubCache): void {
  try {
    window.sessionStorage.setItem(`${CACHE_PREFIX}${username}`, JSON.stringify(payload))
  } catch {
    // Private mode or a full storage quota: caching is optional.
  }
}

function describe(repo: GithubRepo, note: ProjectNote | undefined): string {
  if (note?.description) return note.description
  const description = (repo.description ?? '').trim()
  if (description.length > 8 && description !== '...') return description
  return 'No description on GitHub yet.'
}

export interface UseGithubReposOptions {
  limit?: number
  featured?: string[]
  notes?: Record<string, ProjectNote>
}

export interface GithubReposResult {
  repos: Project[] | null
  status: LoadStatus
  error: string | null
  syncedAt: number | null
  refresh: () => void
}

/**
 * Public repositories from GitHub, newest first. Pinned names in `featured`
 * are moved to the front. Cached in sessionStorage so a normal visit only
 * costs one unauthenticated API request.
 */
export function useGithubRepos(
  username: string,
  { limit = 5, featured = NO_FEATURED, notes = NO_NOTES }: UseGithubReposOptions = {},
): GithubReposResult {
  const [repos, setRepos] = useState<Project[] | null>(
    () => readCache(username)?.repos.slice(0, limit) ?? null,
  )
  const [syncedAt, setSyncedAt] = useState<number | null>(
    () => readCache(username)?.syncedAt ?? null,
  )
  const [status, setStatus] = useState<LoadStatus>(() =>
    readCache(username) ? 'ready' : username ? 'loading' : 'error',
  )
  const [error, setError] = useState<string | null>(null)
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
      // The cache holds the full ranked list, so a changed `limit` still shows
      // the right number of cards without a refetch.
      setRepos(cached.repos.slice(0, limit))
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
        return (await response.json()) as GithubRepo[]
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return

        const rank = (repo: GithubRepo) => {
          const index = featured.indexOf(repo.name)
          return index === -1 ? Number.MAX_SAFE_INTEGER : index
        }

        const mapped: Project[] = data
          .filter((repo) => !repo.fork && !repo.archived && repo.name !== username)
          .sort(
            (a, b) =>
              rank(a) - rank(b) ||
              new Date(b.pushed_at ?? 0).getTime() - new Date(a.pushed_at ?? 0).getTime(),
          )
          .map((repo, index) => {
            const note = notes[repo.name] ?? {}
            return {
              title: repo.name,
              description: describe(repo, note),
              tags:
                note.tags ??
                [repo.language, ...(repo.topics ?? [])]
                  .filter((tag): tag is string => Boolean(tag))
                  .slice(0, 3),
              url: repo.html_url,
              homepage: repo.homepage || '',
              stars: repo.stargazers_count ?? 0,
              updatedAt: repo.pushed_at,
              language: repo.language || 'Code',
              languageColor: LANGUAGE_COLORS[repo.language ?? ''] ?? '#a1a1aa',
              accent: note.accent ?? ACCENTS[index % ACCENTS.length],
              icon: 'github',
            }
          })

        if (!mapped.length) throw new Error('This GitHub account has no public repositories yet.')

        const synced = Date.now()
        setRepos(mapped.slice(0, limit))
        setSyncedAt(synced)
        setStatus('ready')
        setError(null)
        // Store the unsliced list so the display limit can change later.
        writeCache(username, { repos: mapped, syncedAt: synced })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : String(cause))
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
