import { useEffect, useRef, useState } from 'react'

const SESSION_KEY = 'meroo.viewed'
const POLL_MS = 20_000

/**
 * Total page views from /api/views (backed by a tiny public counter).
 * The first request of a browser session increments the counter; every later
 * request is read-only. The value is polled so the badge feels live.
 */
export function useViews() {
  const [count, setCount] = useState(null)
  const [offline, setOffline] = useState(false)
  const firstRef = useRef(true)

  useEffect(() => {
    let alive = true
    let timer = 0

    const load = async () => {
      let hit = false
      if (firstRef.current) {
        firstRef.current = false
        try {
          if (!window.sessionStorage.getItem(SESSION_KEY)) {
            window.sessionStorage.setItem(SESSION_KEY, '1')
            hit = true
          }
        } catch {
          // Private mode: just read the value.
        }
      }

      try {
        const response = await fetch(`/api/views${hit ? '?hit=1' : ''}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (!alive) return
        if (Number.isFinite(data?.count)) {
          setCount(data.count)
          setOffline(false)
        } else {
          setOffline(true)
        }
      } catch {
        if (alive) setOffline(true)
      }
    }

    load()
    timer = window.setInterval(load, POLL_MS)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  return { count, offline }
}
