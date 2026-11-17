import { useEffect, useState } from 'react'
import type { LanyardState, Presence } from '../types'
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
 * ad-blockers). The same-origin `/api/lanyard` proxy is tried first so those
 * networks never log a failed cross-origin request; the direct host is only
 * used when the proxy is missing (for example on a static host) or broken.
 */
let directBlockedUntil = 0
let proxyBlockedUntil = 0

interface PresenceResult {
  data: Presence | undefined
  via: 'proxy' | 'direct'
}

interface LanyardPayload {
  success?: boolean
  error?: { message?: string }
  data?: Presence
}

interface SocketMessage {
  op?: number
  t?: string
  d?: unknown
}

interface HelloPayload {
  heartbeat_interval?: number
}

async function readLanyard(url: string, timeout: number): Promise<Presence | undefined> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    const json = (await response.json().catch(() => null)) as LanyardPayload | null
    if (!response.ok || !json?.success) {
      throw new Error(json?.error?.message || `Lanyard HTTP ${response.status}`)
    }
    return json.data
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPresence(userId: string): Promise<PresenceResult> {
  let proxyError: unknown = null

  if (Date.now() >= proxyBlockedUntil) {
    try {
      return {
        data: await readLanyard(
          `${PROXY_URL}?userId=${encodeURIComponent(userId)}`,
          PROXY_TIMEOUT,
        ),
        via: 'proxy',
      }
    } catch (error) {
      proxyError = error
      // The proxy is not deployed (or is down): fall back to the direct host
      // for a few minutes instead of retrying a dead endpoint every poll.
      proxyBlockedUntil = Date.now() + DIRECT_RETRY_MS
    }
  }

  try {
    return { data: await readLanyard(`${REST_URL}/${userId}`, DIRECT_TIMEOUT), via: 'direct' }
  } catch (error) {
    directBlockedUntil = Date.now() + DIRECT_RETRY_MS
    throw proxyError ?? error
  }
}

export interface UseLanyardOptions {
  demoFallback?: boolean
}

export interface LanyardResult {
  presence: Presence | null
  state: LanyardState
  error: string | null
  lastUpdate: number | null
  isDemo: boolean
  isLive: boolean
  loading: boolean
}

/**
 * Discord presence via Lanyard.
 * REST for the initial snapshot, WebSocket for live updates, and REST polling
 * as a fallback when the socket cannot connect.
 *
 * state: 'demo' | 'connecting' | 'live' | 'error'
 */
export function useLanyard(
  userId: string,
  { demoFallback = true }: UseLanyardOptions = {},
): LanyardResult {
  const [presence, setPresence] = useState<Presence | null>(null)
  const [state, setState] = useState<LanyardState>(
    userId ? 'connecting' : demoFallback ? 'demo' : 'error',
  )
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  useEffect(() => {
    let closed = false
    let socket: WebSocket | null = null
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let demoTimer: ReturnType<typeof setTimeout> | null = null
    let polling = false
    let pollInFlight = false
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

    const apply = (data: Presence | null | undefined) => {
      if (closed || !data) return
      received = true
      // A real payload makes the delayed demo fallback unnecessary.
      if (demoTimer) {
        clearTimeout(demoTimer)
        demoTimer = null
      }
      setPresence(data)
      setState('live')
      setError(null)
      setLastUpdate(Date.now())
    }

    const fallbackToDemo = (message: string) => {
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
      if (pollTimer) clearTimeout(pollTimer)
      pollTimer = null
    }

    const poll = async () => {
      if (closed || !polling || pollInFlight) return
      // A hidden tab has nothing to render. Keep the cadence but skip the
      // request until it is visible again; `onVisibility` polls immediately.
      if (document.hidden) {
        pollTimer = setTimeout(poll, POLL_MS)
        return
      }
      pollInFlight = true
      try {
        const result = await fetchPresence(userId)
        apply(result.data)
      } catch (err) {
        if (!closed && !received) fallbackToDemo(errorMessage(err))
      } finally {
        pollInFlight = false
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

    // Catch up as soon as the tab comes back instead of waiting for the next tick.
    const onVisibility = () => {
      if (document.hidden || closed || !polling) return
      if (pollTimer) clearTimeout(pollTimer)
      pollTimer = null
      poll()
    }
    document.addEventListener('visibilitychange', onVisibility)

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
      let current: WebSocket

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
        if (retryTimer) clearTimeout(retryTimer)
        retryTimer = null
      }

      current.onmessage = (event) => {
        if (closed || socket !== current) return
        let message: SocketMessage
        try {
          message = JSON.parse(String(event.data)) as SocketMessage
        } catch {
          return
        }

        // Hello → start heartbeat + subscribe
        if (message.op === 1) {
          const hello = message.d as HelloPayload | undefined
          const interval = hello?.heartbeat_interval ?? 30_000
          if (heartbeat) clearInterval(heartbeat)
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
          apply(message.d as Presence | undefined)
        }
      }

      current.onclose = () => {
        if (closed || socket !== current) return
        if (heartbeat) clearInterval(heartbeat)
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

    // 1) INITIAL SNAPSHOT (proxy first, direct as fallback)
    fetchPresence(userId)
      .then(({ data, via }) => {
        apply(data)
        if (closed) return

        if (via === 'proxy') {
          // The same-origin proxy works, so the browser never needs to touch
          // api.lanyard.rest. Poll it for updates instead of opening a socket
          // that would fail (and log an error) on restricted networks.
          startPolling(POLL_MS)
          return
        }

        if (Date.now() < directBlockedUntil) {
          startPolling(POLL_MS)
          scheduleSocketRetry()
          return
        }

        // 2) LIVE UPDATES (WebSocket) when the direct host is reachable.
        connect()
      })
      .catch((err: unknown) => {
        // Give the socket/poll a moment before showing the offline state.
        demoTimer = setTimeout(() => {
          demoTimer = null
          if (!closed && !received) fallbackToDemo(errorMessage(err))
        }, DEMO_DELAY)
        if (!closed) {
          startPolling()
          scheduleSocketRetry()
        }
      })

    return () => {
      closed = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (heartbeat) clearInterval(heartbeat)
      if (reconnect) clearTimeout(reconnect)
      if (pollTimer) clearTimeout(pollTimer)
      if (retryTimer) clearTimeout(retryTimer)
      if (demoTimer) clearTimeout(demoTimer)
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
