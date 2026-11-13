import { useEffect, useState } from 'react'

/**
 * Discord only sends an activity's artwork when the app defines Rich Presence
 * assets. Games detected through the client (Genshin, HSR, most launchers)
 * often arrive with no `assets` at all, so the HUD shows a generic glyph.
 *
 * Discord's public "detectable applications" list does include each app's icon
 * hash, but it is ~13 MB — far too big for the browser. `/api/app-icon` does
 * that lookup server-side and caches it; this hook just remembers the results
 * for the session so every row resolves at most once.
 */

const cache = new Map()

export function appIconUrl(applicationId, hash, size = 128) {
  if (!applicationId || !hash) return null
  return `https://cdn.discordapp.com/app-icons/${applicationId}/${hash}.png?size=${size}`
}

function snapshot(key) {
  const icons = {}
  for (const id of key ? key.split(',') : []) {
    const url = cache.get(id)
    if (url) icons[id] = url
  }
  return icons
}

export function useAppIcons(ids) {
  const key = [...new Set((ids ?? []).filter(Boolean))].sort().join(',')
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!key) return undefined
    const missing = key.split(',').filter((id) => !cache.has(id))
    if (!missing.length) return undefined

    let alive = true
    fetch(`/api/app-icon?ids=${missing.join(',')}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive || !data?.icons) return
        let changed = false
        Object.entries(data.icons).forEach(([id, url]) => {
          if (url && !cache.has(id)) {
            cache.set(id, url)
            changed = true
          }
        })
        if (changed) setTick((value) => value + 1)
      })
      .catch(() => {
        // Offline or blocked: the row keeps its themed glyph fallback.
      })

    return () => {
      alive = false
    }
  }, [key])

  // The module cache is the source of truth, so the value can be derived
  // during render; `setTick` above only schedules the re-render after a fetch.
  return snapshot(key)
}
