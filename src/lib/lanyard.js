import { useEffect, useState } from 'react'
import { createDemoPresence } from './demoPresence'

const SOCKET_URL = 'wss://api.lanyard.rest/socket'
const REST_URL = 'https://api.lanyard.rest/v1/users'

/**
 * Discord presence via Lanyard.
 * REST for the initial snapshot, WebSocket for live updates.
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

    // 1) INITIAL SNAPSHOT (REST)
    fetch(`${REST_URL}/${userId}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message || `Lanyard HTTP ${res.status}`)
        }
        apply(json.data)
      })
      .catch((err) => {
        // Give the socket a moment before showing the offline state.
        setTimeout(() => {
          if (!closed && !received) fallbackToDemo(err.message)
        }, 3500)
      })

    // 2) LIVE UPDATES (WebSocket)
    const connect = () => {
      if (closed) return
      socket = new WebSocket(SOCKET_URL)

      socket.onmessage = (event) => {
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
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ op: 3 }))
            }
          }, interval)
          socket.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }))
        }

        if (message.op === 0 && (message.t === 'INIT_STATE' || message.t === 'PRESENCE_UPDATE')) {
          attempts = 0
          apply(message.d)
        }
      }

      socket.onclose = () => {
        clearInterval(heartbeat)
        if (closed) return
        attempts += 1
        const delay = Math.min(30_000, 2 ** Math.min(attempts, 5) * 1000)
        reconnect = setTimeout(connect, delay)
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      closed = true
      clearInterval(heartbeat)
      clearTimeout(reconnect)
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
