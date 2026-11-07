import { useState } from 'react'
import { AppWindow, Code2, Gamepad2, Globe, Monitor, Music2, Smartphone } from 'lucide-react'
import { activityImage, activityLabel, formatClock, formatElapsed, isCustomStatus, statusMeta } from '../lib/format'
import { useNow } from '../lib/hooks'
import { Equalizer, StatusDot } from './ui'

function iconFor(name = '') {
  if (/code|studio/i.test(name)) return Code2
  if (/spotify|music/i.test(name)) return Music2
  if (/game|valorant|minecraft|league|steam/i.test(name)) return Gamepad2
  return AppWindow
}

export function ActivityArt({ activity, className = 'h-12 w-12', rounded = 'rounded-xl' }) {
  const [failed, setFailed] = useState(false)
  const src = activityImage(activity)
  const Icon = iconFor(activity?.name)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={activity?.name ?? 'Activity'}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} ${rounded} shrink-0 object-cover shadow-lg ring-1 ring-white/10`}
      />
    )
  }

  return (
    <div
      className={`${className} ${rounded} grid shrink-0 place-items-center bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-indigo-600/30 text-violet-200 ring-1 ring-white/10`}
      aria-hidden="true"
    >
      <Icon className="h-[42%] w-[42%]" />
    </div>
  )
}

/** Album cover with a graceful fallback when the CDN image cannot load. */
export function AlbumArt({ src, alt = '', className = 'h-11 w-11', rounded = 'rounded-lg' }) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} ${rounded} shrink-0 object-cover shadow-lg ring-1 ring-white/10`}
      />
    )
  }

  return (
    <div
      className={`${className} ${rounded} grid shrink-0 place-items-center bg-gradient-to-br from-emerald-500/40 via-teal-500/20 to-cyan-500/30 text-emerald-200 ring-1 ring-white/10`}
      aria-hidden="true"
    >
      <Music2 className="h-[42%] w-[42%]" />
    </div>
  )
}

export function SpotifyProgress({ spotify, showTimes = true, className = '' }) {
  const now = useNow(1000)
  if (!spotify?.timestamps?.start || !spotify?.timestamps?.end) return null

  const total = Math.max(1, spotify.timestamps.end - spotify.timestamps.start)
  const elapsed = Math.min(total, Math.max(0, now - spotify.timestamps.start))
  const percent = Math.min(100, (elapsed / total) * 100)

  return (
    <div className={className}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 transition-[width] duration-1000 ease-linear"
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 animate-pulse-soft bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)]" />
      </div>
      {showTimes ? (
        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tracking-tight text-zinc-500">
          <span>{formatClock(elapsed)}</span>
          <span>{formatClock(total)}</span>
        </div>
      ) : null}
    </div>
  )
}

export function CustomStatus({ presence, className = '' }) {
  const activity = presence?.activities?.find(isCustomStatus)
  if (!activity?.state) return null
  const emoji = activity.emoji?.name
  return (
    <p className={`flex items-start gap-1.5 text-sm leading-snug text-zinc-300 ${className}`}>
      {emoji ? <span className="shrink-0">{emoji}</span> : null}
      <span>{activity.state}</span>
    </p>
  )
}

export function ActivityRow({ activity, dense = false }) {
  useNow(1000)
  const elapsed = formatElapsed(activity.timestamps?.start ?? activity.created_at)

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] transition-colors duration-300 hover:border-violet-400/25 hover:bg-white/[0.05] ${
        dense ? 'px-3 py-2.5' : 'p-3'
      }`}
    >
      <ActivityArt activity={activity} className={dense ? 'h-10 w-10' : 'h-12 w-12'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-zinc-100">{activity.name}</p>
        {activity.details ? (
          <p className="truncate text-xs text-zinc-400">{activity.details}</p>
        ) : activity.state ? (
          <p className="truncate text-xs text-zinc-400">{activity.state}</p>
        ) : null}
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-zinc-500">
          {activityLabel(activity.type)}
          {elapsed ? ` · ${elapsed}` : ''}
        </p>
      </div>
    </div>
  )
}

export function ClientStatus({ presence, className = '' }) {
  const items = [
    { key: 'desktop', active: presence?.active_on_discord_desktop, Icon: Monitor, label: 'Desktop' },
    { key: 'mobile', active: presence?.active_on_discord_mobile, Icon: Smartphone, label: 'Mobile' },
    { key: 'web', active: presence?.active_on_discord_web, Icon: Globe, label: 'Web' },
  ]
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {items.map(({ key, active, Icon, label }) => (
        <span
          key={key}
          title={label}
          className={`grid h-7 w-7 place-items-center rounded-lg border transition-colors ${
            active
              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
              : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      ))}
    </div>
  )
}

export function StatusPill({ status, className = '' }) {
  const meta = statusMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.soft} ${className}`}
    >
      <StatusDot status={status} pulse={status !== 'offline'} className="h-2 w-2" />
      {meta.label}
    </span>
  )
}

export function SpotifyLine({ spotify, className = '' }) {
  if (!spotify) return null
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AlbumArt
        src={spotify.album_art_url}
        alt={spotify.album ?? spotify.song}
        className="h-11 w-11"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-emerald-300">
          <Equalizer className="h-3" />
          <p className="truncate text-[13px] font-semibold text-zinc-100">{spotify.song}</p>
        </div>
        <p className="truncate text-xs text-zinc-400">{spotify.artist}</p>
      </div>
    </div>
  )
}

/**
 * Same layout as SpotifyLine, but for any other listening activity
 * (YouTube Music, Apple Music, SoundCloud, …) and its Discord artwork.
 */
export function MusicLine({ track, className = '', dense = false }) {
  if (!track) return null

  const body = (
    <div className={`flex items-center gap-3 ${className}`}>
      <AlbumArt
        src={track.art}
        alt={track.album || track.title}
        className={dense ? 'h-10 w-10' : 'h-11 w-11'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-emerald-300">
          <Equalizer className="h-3" />
          <p className="truncate text-[13px] font-semibold text-zinc-100">{track.title}</p>
        </div>
        <p className="truncate text-xs text-zinc-400">
          {[track.artist, track.album].filter(Boolean).join(' · ') || track.app}
        </p>
      </div>
    </div>
  )

  if (!track.url) return body

  return (
    <a href={track.url} target="_blank" rel="noreferrer" className="block rounded-xl transition-colors hover:bg-white/[0.03]">
      {body}
    </a>
  )
}
