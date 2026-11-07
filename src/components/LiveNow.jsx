import {
  Activity,
  Clock3,
  ExternalLink,
  Headphones,
  Moon,
  Radio,
  RefreshCw,
  Sparkles,
  WifiOff,
} from 'lucide-react'
import { isCustomStatus, activityLabel, formatElapsed, timeAgo } from '../lib/format'
import { useNow } from '../lib/hooks'
import { DiscordIcon, SpotifyIcon } from './icons'
import {
  ActivityArt,
  ActivityRow,
  ClientStatus,
  CustomStatus,
  SpotifyProgress,
  StatusPill,
} from './presence-parts'
import { Equalizer, LiveBadge, Reveal, SectionHeading } from './ui'

function NowPlayingCard({ presence, isLive, isDemo }) {
  useNow(1000)
  const spotify = presence?.listening_to_spotify ? presence.spotify : null
  const activities = (presence?.activities ?? []).filter((a) => !isCustomStatus(a))
  const top = activities[0]
  const elapsed = top ? formatElapsed(top.timestamps?.start ?? top.created_at) : null
  const trackUrl =
    spotify?.track_id && !spotify.track_id.startsWith('demo')
      ? `https://open.spotify.com/track/${spotify.track_id}`
      : null

  if (!spotify && !top) {
    return (
      <div className="glass-strong relative flex h-full min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-3xl p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12),transparent_65%)]" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-violet-200">
          <Moon className="h-7 w-7" />
        </div>
        <h3 className="relative mt-5 font-display text-xl font-semibold text-white">Nothing running right now</h3>
        <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
          Could be a break, or I just closed everything. This page updates on its own, so check back in a minute.
        </p>
        <div className="relative mt-5">
          <LiveBadge isLive={isLive} isDemo={isDemo} />
        </div>
      </div>
    )
  }

  return (
    <div className="glass-strong relative h-full overflow-hidden rounded-3xl p-6 sm:p-8">
      {spotify?.album_art_url ? (
        <div
          className="absolute inset-0 scale-125 bg-cover bg-center opacity-[0.16] blur-3xl"
          style={{ backgroundImage: `url(${spotify.album_art_url})` }}
          aria-hidden="true"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.18),transparent_60%)]" />
      )}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
          {spotify ? <SpotifyIcon className="h-3.5 w-3.5 text-emerald-400" /> : <Activity className="h-3.5 w-3.5 text-violet-300" />}
          {spotify ? 'Now playing' : activityLabel(top.type)}
        </span>
        <LiveBadge isLive={isLive} isDemo={isDemo} />
      </div>

      {spotify ? (
        <div className="relative mt-7 flex flex-col gap-7 sm:flex-row sm:items-center">
          <div className="relative w-40 shrink-0 self-center sm:self-start">
            <div className="absolute -inset-3 rounded-3xl bg-emerald-400/20 blur-2xl" aria-hidden="true" />
            <div className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/15">
              {spotify.album_art_url ? (
                <img src={spotify.album_art_url} alt={spotify.album ?? spotify.song} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-500 to-teal-800">
                  <SpotifyIcon className="h-10 w-10 text-white/85" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-emerald-300">
              <Equalizer />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Spotify</span>
            </div>
            <h3 className="mt-2 truncate font-display text-2xl font-semibold text-white sm:text-3xl">{spotify.song}</h3>
            <p className="mt-1 truncate text-sm text-zinc-300">{spotify.artist}</p>
            <p className="truncate text-xs text-zinc-500">{spotify.album}</p>

            <SpotifyProgress spotify={spotify} className="mt-5" />

            {trackUrl ? (
              <a
                href={trackUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/15"
              >
                Open on Spotify <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="relative mt-7 flex flex-col gap-6 sm:flex-row sm:items-center">
          <ActivityArt activity={top} className="h-36 w-36 sm:h-40 sm:w-40" rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-2xl font-semibold text-white sm:text-3xl">{top.name}</h3>
            {top.details ? <p className="mt-1.5 truncate text-sm text-zinc-300">{top.details}</p> : null}
            {top.state ? <p className="truncate text-sm text-zinc-400">{top.state}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5">
                <Clock3 className="h-3.5 w-3.5 text-violet-300" /> {elapsed ?? 'just started'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5">
                <Headphones className="h-3.5 w-3.5 text-violet-300" /> {activityLabel(top.type)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-violet-300/80" /> Synced through the Lanyard WebSocket
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" /> real-time
        </span>
      </div>
    </div>
  )
}

function StatusCard({ presence, lastUpdate }) {
  const now = useNow(30_000)
  const user = presence?.discord_user
  const activities = (presence?.activities ?? []).filter((a) => !isCustomStatus(a))

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <DiscordIcon className="h-4 w-4 text-indigo-300" /> Discord
        </h3>
        <StatusPill status={presence?.discord_status ?? 'offline'} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {user?.global_name || user?.username || '—'}
          </p>
          <p className="truncate text-xs text-zinc-500">@{user?.username ?? '—'}</p>
        </div>
      </div>

      <CustomStatus
        presence={presence}
        className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
      />

      <dl className="mt-4 space-y-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-500">Devices</dt>
          <dd>
            <ClientStatus presence={presence} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-500">Activities</dt>
          <dd className="font-medium text-zinc-200">{activities.length} active</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-zinc-500">Last update</dt>
          <dd className="font-medium text-zinc-200">{lastUpdate ? timeAgo(lastUpdate, now) : '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

function ActivitiesCard({ presence }) {
  const activities = (presence?.activities ?? []).filter((a) => !isCustomStatus(a))

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-fuchsia-300" /> Active activities
        </h3>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
          {activities.length}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {activities.length ? (
          activities.slice(0, 5).map((activity) => (
            <ActivityRow key={`${activity.id}-${activity.name}`} activity={activity} dense />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-zinc-500">
            No apps open right now.
          </p>
        )}
      </div>

      <p className="mt-4 border-t border-white/[0.07] pt-3 text-[10px] leading-relaxed text-zinc-500">
        This comes straight from Discord. Change a song or open an app and the cards here follow along without a
        refresh.
      </p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mt-10 grid animate-pulse gap-5 lg:grid-cols-5">
      <div className="glass h-[22rem] rounded-3xl lg:col-span-3" />
      <div className="space-y-5 lg:col-span-2">
        <div className="glass h-60 rounded-3xl" />
        <div className="glass h-40 rounded-3xl" />
      </div>
    </div>
  )
}

export default function LiveNow({ presence, isLive, isDemo, lastUpdate, loading, error }) {
  return (
    <section id="now" className="relative scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Real-time presence"
            title={
              <>
                What am I <span className="text-gradient">doing</span> right now?
              </>
            }
            description="Not just an online badge. This is my actual Discord activity, streamed over WebSocket: the song, the open app, and how long it has been running."
          />
        </Reveal>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {isDemo ? (
              <Reveal delay={0.05}>
                <div className="mt-6 inline-flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/90">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    You are looking at <strong className="font-semibold">preview data</strong>. Add{' '}
                    <code className="rounded bg-black/30 px-1.5 py-0.5 text-[11px]">VITE_DISCORD_USER_ID</code> to{' '}
                    <code className="rounded bg-black/30 px-1.5 py-0.5 text-[11px]">.env.local</code> and join the
                    Lanyard server to see the real thing.
                  </span>
                </div>
              </Reveal>
            ) : null}

            {!presence && !isLive && !isDemo ? (
              <Reveal delay={0.05}>
                <div className="mt-6 inline-flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-zinc-400">
                  <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span>
                    Presence is offline. {error || 'Lanyard did not return any data.'} The socket will keep trying in
                    the background.
                  </span>
                </div>
              </Reveal>
            ) : null}

            <div className="mt-10 grid gap-5 lg:grid-cols-5">
              <Reveal className="lg:col-span-3" delay={0.05}>
                <NowPlayingCard presence={presence} isLive={isLive} isDemo={isDemo} />
              </Reveal>
              <div className="space-y-5 lg:col-span-2">
                <Reveal delay={0.12}>
                  <StatusCard presence={presence} lastUpdate={lastUpdate} />
                </Reveal>
                <Reveal delay={0.18}>
                  <ActivitiesCard presence={presence} />
                </Reveal>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
