import { useEffect, useState } from 'react'

const SESSION_KEY = 'meroo.viewed'
const POLL_MS = 20_000

interface ViewsResponse {
  count?: number
}

export interface ViewsResult {
  count: number | null
  offline: boolean
}

/**
 * Module-level so React StrictMode's double effect (and a fast tab switch)
 * cannot send the same "hit" twice, while a failed hit stays retryable.
 */
let hitState: 'unknown' | 'pending' | 'done' = 'unknown'
let hitInFlight = false

function shouldHit(): boolean {
  if (hitState === 'unknown') {
    try {
      hitState = window.sessionStorage.getItem(SESSION_KEY) ? 'done' : 'pending'
    } catch {
      // Private mode: treat the session as already counted.
      hitState = 'done'
    }
  }
  return hitState === 'pending'
}

function markCounted(): void {
  hitState = 'done'
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Private mode: the visit may count again next reload.
  }
}

/**
 * Total page views from /api/views (backed by a tiny public counter).
 * The first successful request of a browser session increments the counter;
 * every later request is read-only. The value is polled so the badge feels
 * live, but only while the tab is visible.
 */
export function useViews(): ViewsResult {
  const [count, setCount] = useState<number | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true
    let timer = 0

    const load = async () => {
      const hit = shouldHit() && !hitInFlight
      if (hit) hitInFlight = true
      try {
        const response = await fetch(`/api/views${hit ? '?hit=1' : ''}`, {
          cache: 'no-store',
        })
        const data = (await response.json()) as ViewsResponse | null
        if (!alive) return
        if (typeof data?.count === 'number' && Number.isFinite(data.count)) {
          setCount(data.count)
          setOffline(false)
          if (hit) markCounted()
        } else {
          setOffline(true)
        }
      } catch {
        if (alive) setOffline(true)
      } finally {
        if (hit) hitInFlight = false
      }
    }

    const tick = () => {
      if (document.hidden) return
      load()
    }

    load()
    timer = window.setInterval(tick, POLL_MS)

    const onVisibility = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { count, offline }
}
