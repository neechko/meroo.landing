import { motion } from 'framer-motion'
import { ArrowUpRight, Radio, RefreshCw, Sparkles, WifiOff } from 'lucide-react'
import { discordProfileUrl, site } from '../config'
import { avatarUrl, isCustomStatus, statusMeta, timeAgo } from '../lib/format'
import { useNow } from '../lib/hooks'
import { SpotifyIcon } from './icons'
import {
  ActivityRow,
  ClientStatus,
  CustomStatus,
  SpotifyLine,
  SpotifyProgress,
  StatusPill,
} from './presence-parts'
import { LiveBadge } from './ui'

function Skeleton() {
  return (
    <div className="glass-strong relative overflow-hidden rounded-[28px] p-6">
      <div className="animate-pulse">
        <div className="relative -mx-6 -mt-6 h-24 overflow-hidden bg-white/[0.04]">
          <img
            src="/castorice-hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[50%_16%] opacity-25"
          />
        </div>
        <div className="-mt-10 h-20 w-20 rounded-full bg-white/[0.08] ring-4 ring-[#0a0617]" />
        <div className="mt-4 h-5 w-32 rounded bg-white/[0.08]" />
        <div className="mt-2 h-3 w-24 rounded bg-white/[0.05]" />
        <div className="mt-6 h-16 rounded-2xl bg-white/[0.04]" />
        <div className="mt-4 h-12 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  )
}

export default function PresenceCard({ presence, loading, isLive, isDemo, lastUpdate }) {
  const now = useNow(30_000)

  if (loading) return <Skeleton />

  const user = presence?.discord_user

  if (!presence) {
    return (
      <div className="relative rounded-[28px] bg-gradient-to-br from-violet-400/30 via-white/10 to-cyan-300/20 p-px shadow-[0_40px_120px_-40px_rgba(88,28,135,0.9)]">
        <div className="glass-strong relative overflow-hidden rounded-[27px]">
          <div className="relative h-28 overflow-hidden">
            <img
              src="/castorice-hero.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[50%_16%] opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0617] via-[#0a0617]/45 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(139,92,246,0.4),transparent_65%)]" />
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300 backdrop-blur">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          </div>

          <div className="px-6 pb-7 pt-4 text-center">
            <div className="mx-auto -mt-12 grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-[#0a0617] p-1 shadow-[0_0_40px_-10px_rgba(167,139,250,0.7)]">
              <img
                src="/profile.jpg"
                alt=""
                className="h-full w-full rounded-full object-cover opacity-70 grayscale"
              />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-white">Presence is offline</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
              {site.discordUserId
                ? 'The card only shows real data. Discord or Lanyard is not answering right now, and it will reconnect on its own.'
                : 'The card only shows real data. Add a Discord user ID so it has something honest to display.'}
            </p>

            {discordProfileUrl ? (
              <a
                href={discordProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              >
                Open Discord profile <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : (
              <a
                href="https://discord.gg/lanyard"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              >
                How to connect <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Lanyard · no fake data
            </p>
          </div>
        </div>
      </div>
    )
  }

  const meta = statusMeta(presence.discord_status)
  const activities = (presence.activities ?? []).filter((a) => !isCustomStatus(a))
  const topActivity = activities[0]
  const spotify = presence.listening_to_spotify ? presence.spotify : null
  const displayName = user?.global_name || user?.username || site.displayName

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
      style={{ perspective: 1200 }}
    >
      {/* glow behind the card */}
      <div className="absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.35),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.18),transparent_55%)] blur-2xl" />

      <div className="relative rounded-[28px] bg-gradient-to-br from-violet-400/40 via-white/10 to-cyan-300/30 p-px shadow-[0_40px_120px_-40px_rgba(88,28,135,0.9)]">
        <div className="glass-strong relative overflow-hidden rounded-[27px]">
          {/* banner */}
          <div className="relative h-24 overflow-hidden">
            <img
              src="/castorice-hero.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[50%_16%] opacity-85"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,4,15,0.72),rgba(6,4,15,0.12)_45%,rgba(6,4,15,0.55))]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0617] via-transparent to-transparent" />
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:26px_26px]" />
            <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-4 h-20 w-20 rounded-full border border-white/10" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <LiveBadge isLive={isLive} isDemo={isDemo} />
              <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/60 backdrop-blur sm:inline-flex">
                <Radio className="h-3 w-3" /> Lanyard
              </span>
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* avatar */}
            <div className="-mt-11 flex items-end justify-between gap-3">
              <div className="avatar-ring rounded-full p-[2px] shadow-[0_0_40px_-8px_rgba(167,139,250,0.8)]">
                <div className="rounded-full bg-[#0a0617] p-[3px]">
                  <div className="relative">
                    <img
                      src={avatarUrl(user, 256)}
                      alt={`${displayName}'s avatar`}
                      className="h-[76px] w-[76px] rounded-full object-cover"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full ring-4 ring-[#0a0617]"
                      style={{ backgroundColor: meta.color }}
                      title={meta.label}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-black/25" />
                    </span>
                  </div>
                </div>
              </div>
              <StatusPill status={presence.discord_status} className="mb-1" />
            </div>

            {/* identity */}
            <div className="mt-3">
              <h3 className="font-display text-xl font-semibold tracking-tight text-white">
                {displayName}
              </h3>
              <p className="text-sm text-zinc-500">@{user?.username ?? site.name}</p>
            </div>

            <CustomStatus presence={presence} className="mt-2.5" />

            <div className="my-4 h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent" />

            {/* activity */}
            {spotify ? (
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
                    <SpotifyIcon className="h-3 w-3" /> Spotify
                  </span>
                  <span className="text-[10px] text-zinc-500">now playing</span>
                </div>
                <SpotifyLine spotify={spotify} />
                <SpotifyProgress spotify={spotify} className="mt-3" />
              </div>
            ) : topActivity ? (
              <ActivityRow activity={topActivity} dense />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-sm text-zinc-500">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]">
                  <Sparkles className="h-4 w-4 text-violet-300/70" />
                </span>
                <span>Nothing running right now.</span>
              </div>
            )}

            {activities.length > 1 && !spotify ? (
              <p className="mt-2 text-center text-[11px] text-zinc-500">
                +{activities.length - 1} more {activities.length === 2 ? 'activity' : 'activities'}
              </p>
            ) : null}

            {/* footer */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <ClientStatus presence={presence} />
              {discordProfileUrl ? (
                <a
                  href={discordProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-white"
                >
                  Discord profile
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ) : null}
            </div>

            <p className="mt-3 flex items-center justify-between text-[10px] text-zinc-600">
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-2.5 w-2.5" />
                Updated {lastUpdate ? timeAgo(lastUpdate, now) : '—'}
              </span>
              <span>{isDemo ? 'preview data · local only' : 'synced in real time'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* decorative chip */}
      <div className="glass animate-float absolute -left-5 top-1/2 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-zinc-200 shadow-xl xl:flex">
        <img src="/castorice5.jpg" alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/20" />
        {spotify ? spotify.song : site.anime.character}
      </div>
    </motion.div>
  )
}
