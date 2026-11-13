import { Activity, ExternalLink, Headphones, WifiOff } from 'lucide-react'
import { useAppIcons } from '../lib/appIcons'
import { isCustomStatus, isMusicActivity, formatClock, timeAgo } from '../lib/format'
import { useNow } from '../lib/hooks'
import HudPanel, { PanelHead } from './HudPanel'
import { PlayGlyph } from './icons'
import { AlbumArt, ActivityRow, ClientStatus, CustomStatus } from './presence-parts'
import { Equalizer, LiveBadge } from './ui'

function TrackProgress({ timestamps, className = '' }) {
  const now = useNow(1000)
  if (!timestamps?.start || !timestamps?.end) return null

  const total = Math.max(1, timestamps.end - timestamps.start)
  const elapsed = Math.min(total, Math.max(0, now - timestamps.start))
  const percent = Math.min(100, (elapsed / total) * 100)

  return (
    <div className={className}>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 transition-[width] duration-1000 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-zinc-500">
        <span>{formatClock(elapsed)}</span>
        <span>{formatClock(total)}</span>
      </div>
    </div>
  )
}

function NowPlaying({ track, onPlay, bgmActive = false }) {
  return (
    <div className="activity-now card-zoom relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.045] p-3 transition duration-300 hover:border-emerald-300/30">
      {track.art ? (
        <img
          src={track.art}
          alt=""
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full object-cover opacity-25 blur-2xl"
        />
      ) : null}

      <div className="relative flex items-start gap-3">
        <AlbumArt
          src={track.art}
          alt={track.album || track.title}
          className="activity-now-art h-[60px] w-[60px] shrink-0"
          rounded="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-emerald-400/25">
              <Equalizer className="h-2.5" />
              {track.source}
            </span>
            {bgmActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-violet-200 ring-1 ring-violet-400/25">
                <span className="h-1 w-1 rounded-full bg-violet-300 shadow-[0_0_6px_1px_rgba(196,181,253,0.8)]" />
                bgm
              </span>
            ) : null}
          </div>
          <p className="activity-now-title mt-1.5 truncate font-display text-[15px] font-semibold leading-tight text-white">
            {track.title}
          </p>
          <p className="truncate text-[11px] text-zinc-400">{track.artist || 'Unknown artist'}</p>
          {track.album ? (
            <p className="activity-now-album truncate font-mono text-[8.5px] uppercase tracking-[0.12em] text-zinc-500">{track.album}</p>
          ) : null}
        </div>

        {/* Actions stay on the side of the card header, above the activity
            rows, so neither one can ever be covered by what sits below. */}
        <div className="relative z-[2] flex shrink-0 flex-col items-stretch gap-1.5">
          {track.embed ? (
            <button
              type="button"
              onClick={onPlay}
              aria-label={`Play ${track.title} here`}
              title="Play here"
              className="group/play inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-300/30 bg-gradient-to-r from-violet-500/25 via-indigo-500/20 to-cyan-400/20 px-2.5 py-1.5 text-[10px] font-semibold text-violet-100 shadow-[0_8px_20px_-12px_rgba(139,92,246,0.95)] transition hover:border-cyan-300/45 hover:from-violet-500/35 hover:to-cyan-400/30 hover:text-white active:scale-95"
            >
              <PlayGlyph className="h-3.5 w-3.5 text-cyan-200 transition group-hover/play:text-cyan-100" />
              Play here
            </button>
          ) : null}
          {track.external ? (
            <a
              href={track.external}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
              Open source
            </a>
          ) : null}
        </div>
      </div>

      <TrackProgress timestamps={track.progress} className="relative mt-3" />
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="animate-pulse space-y-2.5">
      <div className="h-14 rounded-xl bg-white/[0.04]" />
      <div className="h-24 rounded-2xl bg-white/[0.04]" />
      <div className="h-12 rounded-xl bg-white/[0.03]" />
    </div>
  )
}

export default function ActivityPanel({
  presence,
  nowPlaying,
  loading,
  isLive,
  isDemo,
  lastUpdate,
  error,
  onPlay,
  bgmActive = false,
  className = '',
}) {
  const now = useNow(15_000)
  const activities = (presence?.activities ?? []).filter(
    (item) => !isCustomStatus(item) && !isMusicActivity(item),
  )
  const appIcons = useAppIcons(activities.map((item) => item.application_id))

  const statusNote = loading
    ? 'connecting to discord'
    : isDemo
      ? 'preview data · local only'
      : isLive
        ? `synced ${timeAgo(lastUpdate, now)}`
        : 'presence offline'

  return (
    <HudPanel className={`flex min-h-0 flex-col ${className}`}>
      <PanelHead
        icon={Activity}
        title="Live signal"
        meta={isLive ? 'discord presence · realtime' : statusNote}
        action={<LiveBadge isLive={isLive} isDemo={isDemo} />}
      />

      <div className="activity-feed hud-scroll relative z-[2] flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
        {loading && !presence ? <ActivitySkeleton /> : null}

        {presence ? (
          <>
            <CustomStatus presence={presence} className="text-[12px]" />

            {nowPlaying ? (
              <NowPlaying track={nowPlaying} onPlay={onPlay} bgmActive={bgmActive} />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.015] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-500">
                    <Headphones className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-zinc-200">
                      Nothing on the music channel
                    </p>
                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      When a track starts on Discord, the cover and a player appear here.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activities.length ? (
              <div className="grid gap-1.5">
                {activities.slice(0, 2).map((activity) => (
                  <ActivityRow
                    key={activity.id ?? activity.name}
                    activity={activity}
                    fallbackSrc={appIcons[activity.application_id] ?? null}
                    dense
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[10px] leading-relaxed text-zinc-500">
                No apps open right now. The channel is quiet.
              </div>
            )}
          </>
        ) : null}

        {error && !isDemo ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-amber-200/80">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Discord did not answer. Reconnecting in the background.</span>
          </div>
        ) : null}
      </div>

      <div className="relative z-[2] flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2">
        <ClientStatus presence={presence} />
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-600">{statusNote}</p>
      </div>
    </HudPanel>
  )
}
