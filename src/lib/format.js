export const STATUS_META = {
  online: {
    label: 'Online',
    color: '#23a55a',
    text: 'text-emerald-400',
    soft: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30',
  },
  idle: {
    label: 'Idle',
    color: '#f0b232',
    text: 'text-amber-400',
    soft: 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
  },
  dnd: {
    label: 'Do Not Disturb',
    color: '#f23f43',
    text: 'text-rose-400',
    soft: 'bg-rose-500/10 text-rose-300 ring-rose-400/30',
  },
  offline: {
    label: 'Offline',
    color: '#80848e',
    text: 'text-zinc-400',
    soft: 'bg-zinc-500/10 text-zinc-300 ring-zinc-400/30',
  },
}

export function statusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.offline
}

export function avatarUrl(user, size = 256) {
  if (!user?.avatar) return '/profile.jpg'
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`
}

export function activityImage(activity, key = 'large_image') {
  const asset = activity?.assets?.[key]
  if (!asset) return null
  // Discord external assets look like:
  // mp:external/<hash>/https/<host>/<path>
  // and must be served through media.discordapp.net/external/.
  if (asset.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${asset.slice('mp:external/'.length)}`
  }
  if (asset.startsWith('https://')) return asset
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${asset}.png`
  }
  return null
}

/**
 * Music integrations (Spotify, YouTube Music, Apple Music, SoundCloud, …)
 * show up as activity type 2, with the song in `details` and the artist in
 * `state`. Discord session IDs rotate, so nothing here is cached by us.
 */
const MUSIC_ACTIVITY = /spotify|music|soundcloud|tidal|deezer/i

export function isMusicActivity(activity) {
  if (!activity) return false
  return activity.type === 2 || MUSIC_ACTIVITY.test(activity.name ?? '')
}

export function musicTrack(activity) {
  if (!activity) return null
  const title = activity.details || activity.assets?.large_text || activity.name || 'Unknown track'
  const artist = activity.state || ''
  const album = activity.assets?.large_text

  return {
    title,
    artist,
    album: album && album !== title && album !== artist ? album : '',
    art: activityImage(activity),
    url: activity.details_url || '',
    app: activity.name || 'Music',
    startedAt: activity.timestamps?.start ?? activity.created_at,
  }
}

const ACTIVITY_LABELS = {
  0: 'Playing',
  1: 'Streaming',
  2: 'Listening',
  3: 'Watching',
  4: 'Status',
  5: 'Competing',
}

export function activityLabel(type) {
  return ACTIVITY_LABELS[type] ?? 'Activity'
}

export function isCustomStatus(activity) {
  return activity?.type === 4 || activity?.id === 'custom'
}

/** 2h 14m */
export function formatElapsed(startMs) {
  if (!startMs) return null
  const total = Math.max(0, Date.now() - startMs)
  const h = Math.floor(total / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const s = Math.floor((total % 60_000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** 1:23 */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function timeAgo(ts, now = Date.now()) {
  if (!ts) return 'just now'
  const diff = Math.max(0, now - ts)
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export function localTime(timezone = 'Asia/Jakarta', now = Date.now()) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(now))
  } catch {
    return new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
}
