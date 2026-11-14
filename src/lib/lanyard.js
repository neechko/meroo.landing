import { useEffect, useState } from 'react'
import { createDemoPresence } from './demoPresence'

const SOCKET_URL = 'wss://api.lanyard.rest/socket'
const REST_URL = 'https://api.lanyard.rest/v1/users'
const PROXY_URL = '/api/lanyard'

const DIRECT_TIMEOUT = 4000
const PROXY_TIMEOUT = 8000
const DEMO_DELAY = 3500
const POLL_MS = 20_000
const SOCKET_RETRY_MS = 60_000
const DIRECT_RETRY_MS = 5 * 60_000

/**
 * Some browsers/networks cannot resolve api.lanyard.rest (DNS, VPN, Secure DNS,
 * ad-blockers). Once the direct host fails, stop hammering it on every poll and
 * use the same-origin `/api/lanyard` proxy instead. Re-check after a few minutes
 * in case the network recovers.
 */
let directBlockedUntil = 0

async function readLanyard(url, timeout) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    const json = await response.json().catch(() => null)
    if (!response.ok || !json?.success) {
      throw new Error(json?.error?.message || `Lanyard HTTP ${response.status}`)
    }
    return json.data
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPresence(userId) {
  let directError = null

  if (Date.now() >= directBlockedUntil) {
    try {
      return await readLanyard(`${REST_URL}/${userId}`, DIRECT_TIMEOUT)
    } catch (error) {
      directError = error
      directBlockedUntil = Date.now() + DIRECT_RETRY_MS
    }
  }

  try {
    return await readLanyard(
      `${PROXY_URL}?userId=${encodeURIComponent(userId)}`,
      PROXY_TIMEOUT,
    )
  } catch {
    // If the proxy is not deployed either (static host), let the next attempt
    // try the direct host again instead of staying blocked forever.
    directBlockedUntil = 0
    throw directError ?? new Error('Lanyard is unreachable from this network.')
  }
}

/**
 * Discord presence via Lanyard.
 * REST for the initial snapshot, WebSocket for live updates, and REST polling
 * as a fallback when the socket cannot connect.
 *
 * state: 'demo' | 'connecting' | 'live' | 'error'
 */
export function useLanyard(userId, { demoFallback = true } = {}) {
  const [presence, setPresence] = useState(null)
  const [state, setState] = useState(userId ? 'connecting' : demoFallback ? 'demo' : 'error')
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    let closed = false
    let socket = null
    let heartbeat = null
    let reconnect = null
    let pollTimer = null
    let retryTimer = null
    let polling = false
    let attempts = 0
    let received = false

    setPresence(null)
    setError(null)
    setLastUpdate(null)

    if (!userId) {
      if (demoFallback) {
        setPresence(createDemoPresence())
        setState('demo')
        setLastUpdate(Date.now())
      } else {
        setState('error')
        setError('Discord user ID is not configured.')
      }
      return
    }

    setState('connecting')

    const apply = (data) => {
      if (closed || !data) return
      received = true
      setPresence(data)
      setState('live')
      setError(null)
      setLastUpdate(Date.now())
    }

    const fallbackToDemo = (message) => {
      if (closed) return
      setError(message)
      if (demoFallback) {
        setPresence(createDemoPresence())
        setState('demo')
        setLastUpdate(Date.now())
      } else {
        setState('error')
      }
    }

    const stopPolling = () => {
      polling = false
      clearTimeout(pollTimer)
      pollTimer = null
    }

    const poll = async () => {
      if (closed || !polling) return
      try {
        apply(await fetchPresence(userId))
      } catch (err) {
        if (!closed && !received) fallbackToDemo(err.message)
      } finally {
        if (!closed && polling) pollTimer = setTimeout(poll, POLL_MS)
      }
    }

    const startPolling = (delay = 0) => {
      if (closed || polling) return
      polling = true
      if (delay > 0) {
        pollTimer = setTimeout(poll, delay)
      } else {
        poll()
      }
    }

    const scheduleSocketRetry = () => {
      if (closed || retryTimer) return
      retryTimer = setTimeout(() => {
        retryTimer = null
        // While the direct host is known to be unreachable, polling is the
        // reliable path; wait until the next health check instead of adding
        // another failed WebSocket to the console.
        if (Date.now() < directBlockedUntil) {
          scheduleSocketRetry()
          return
        }
        connect()
      }, SOCKET_RETRY_MS)
    }

    // 2) LIVE UPDATES (WebSocket, with polling fallback)
    const connect = () => {
      if (closed) return

      let opened = false
      let current

      try {
        current = new WebSocket(SOCKET_URL)
      } catch {
        startPolling()
        scheduleSocketRetry()
        return
      }
      socket = current

      current.onopen = () => {
        if (closed || socket !== current) return
        opened = true
        attempts = 0
        stopPolling()
        clearTimeout(retryTimer)
        retryTimer = null
      }

      current.onmessage = (event) => {
        if (closed || socket !== current) return
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }

        // Hello → start heartbeat + subscribe
        if (message.op === 1) {
          const interval = message.d?.heartbeat_interval ?? 30_000
          clearInterval(heartbeat)
          heartbeat = setInterval(() => {
            if (current.readyState === WebSocket.OPEN) {
              current.send(JSON.stringify({ op: 3 }))
            }
          }, interval)
          if (current.readyState === WebSocket.OPEN) {
            current.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }))
          }
        }

        if (message.op === 0 && (message.t === 'INIT_STATE' || message.t === 'PRESENCE_UPDATE')) {
          attempts = 0
          apply(message.d)
        }
      }

      current.onclose = () => {
        if (closed || socket !== current) return
        clearInterval(heartbeat)
        heartbeat = null

        if (opened) {
          attempts += 1
          const delay = Math.min(30_000, 2 ** Math.min(attempts, 5) * 1000)
          reconnect = setTimeout(connect, delay)
          return
        }

        // DNS/offline/blocked: poll through REST (direct or same-origin proxy)
        // and only retry the socket after the direct host's next health check.
        directBlockedUntil = Date.now() + DIRECT_RETRY_MS
        startPolling()
        scheduleSocketRetry()
      }

      current.onerror = () => current.close()
    }

    // 1) INITIAL SNAPSHOT (REST direct → proxy)
    fetchPresence(userId)
      .then((data) => {
        apply(data)
        if (closed) return

        if (Date.now() < directBlockedUntil) {
          // The direct host cannot be resolved from this browser. Poll through
          // the same-origin proxy instead of throwing a WebSocket error on
          // every page load.
          startPolling(POLL_MS)
          scheduleSocketRetry()
          return
        }

        // 2) LIVE UPDATES (WebSocket) when the direct host is reachable.
        connect()
      })
      .catch((err) => {
        // Give the socket/poll a moment before showing the offline state.
        setTimeout(() => {
          if (!closed && !received) fallbackToDemo(err.message)
        }, DEMO_DELAY)
        if (!closed) {
          startPolling()
          scheduleSocketRetry()
        }
      })

    return () => {
      closed = true
      clearInterval(heartbeat)
      clearTimeout(reconnect)
      clearTimeout(pollTimer)
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [userId, demoFallback])

  return {
    presence,
    state,
    error,
    lastUpdate,
    isDemo: state === 'demo',
    isLive: state === 'live',
    loading: state === 'connecting' && !presence,
  }
}
