import { useCallback, useEffect, useRef, useState } from 'react'

const REFRESH_MS = 5 * 60 * 1000
const RETRY_MS = 6000

/**
 * "Currently watching" from MyAnimeList through the small proxy in api/mal.ts.
 * Refreshes every five minutes while the tab is visible, and on demand.
 */
export function useMalList(username, { limit = 6 } = {}) {
  const [entries, setEntries] = useState(null)
  const [watching, setWatching] = useState(0)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [status, setStatus] = useState(username ? 'loading' : 'unconfigured')
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)
  const retryRef = useRef(0)

  const refresh = useCallback(() => {
    retryRef.current = 0
    setNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!username) {
      setStatus('unconfigured')
      return undefined
    }

    let cancelled = false
    let retryTimer = null
    setStatus((current) => (current === 'ready' ? 'refreshing' : 'loading'))

    fetch(`/api/mal?username=${encodeURIComponent(username)}&limit=${limit}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data?.entries)) {
          throw new Error(data?.error || `MyAnimeList proxy returned HTTP ${response.status}.`)
        }
        return data
      })
      .then((data) => {
        if (cancelled) return
        retryRef.current = 0
        setEntries(data.entries)
        setWatching(data.watching ?? data.entries.length)
        setUpdatedAt(data.fetchedAt ?? Date.now())
        setStatus('ready')
        setError(null)
      })
      .catch((cause) => {
        if (cancelled) return
        setError(cause.message)
        // Keep the previous list on screen when a refresh fails.
        setStatus((current) =>
          current === 'ready' || current === 'refreshing' ? 'stale' : 'error',
        )

        // MyAnimeList occasionally takes longer than the proxy timeout.
        // Try exactly once more before leaving the retry button to the user.
        if (retryRef.current < 1) {
          retryRef.current += 1
          retryTimer = setTimeout(() => setNonce((value) => value + 1), RETRY_MS)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [username, limit, nonce])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setNonce((value) => value + 1)
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  return { entries, watching, status, error, updatedAt, refresh }
}
