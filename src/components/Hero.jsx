import { motion } from 'framer-motion'
import { Activity, ArrowDown, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { discordProfileUrl, site } from '../config'
import { localTime, statusMeta } from '../lib/format'
import { useNow, useRotatingText } from '../lib/hooks'
import PresenceCard from './PresenceCard'
import { DiscordIcon, GithubIcon } from './icons'
import { GlowButton, StatusDot } from './ui'

const fade = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Hero({ presence, loading, isLive, isDemo, lastUpdate }) {
  const role = useRotatingText(site.roles)
  const now = useNow(30_000)
  const meta = statusMeta(presence?.discord_status ?? 'offline')

  const statusText = loading
    ? 'Connecting to Discord…'
    : isDemo
      ? 'Preview data · local only'
      : isLive
        ? `Currently ${meta.label.toLowerCase()} · live from Discord`
        : 'Presence offline · nothing to show'

  return (
    <section id="home" className="relative flex min-h-screen scroll-mt-24 items-center overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
          {/* ── LEFT ── */}
          <div className="relative">
            <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" aria-hidden="true" />

            <motion.div variants={fade} initial="hidden" animate="show" custom={0.05} className="relative">
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
                <StatusDot status={presence?.discord_status ?? 'offline'} />
                {loading ? (
                  <span className="text-zinc-400">{statusText}</span>
                ) : (
                  <span>
                    {isDemo || !isLive ? (
                      <span className="text-zinc-400">{statusText}</span>
                    ) : (
                      <>
                        Currently <span className={meta.text}>{meta.label.toLowerCase()}</span>
                        <span className="mx-1.5 text-zinc-600">·</span>
                        <span className="text-zinc-500">live from Discord</span>
                      </>
                    )}
                  </span>
                )}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                </span>
              </span>
            </motion.div>

            <motion.h1
              variants={fade}
              initial="hidden"
              animate="show"
              custom={0.14}
              className="mt-7 font-display text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.35rem]"
            >
              <span className="mb-2 block text-[0.32em] font-medium uppercase tracking-[0.32em] text-zinc-500">
                Hi, I&apos;m
              </span>
              <span className="text-gradient relative inline-block">
                {site.name}
                <Sparkles className="absolute -right-7 -top-2 h-5 w-5 animate-pulse-soft text-fuchsia-300/80" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-[0.52em] font-medium leading-[1.15] tracking-tight text-zinc-300 sm:text-[0.5em]">
                I build interfaces that feel alive.
              </span>
            </motion.h1>

            <motion.div
              variants={fade}
              initial="hidden"
              animate="show"
              custom={0.24}
              className="mt-6 flex h-7 items-center gap-2 font-mono text-sm text-violet-200/90"
            >
              <span className="text-fuchsia-400/80">&gt;</span>
              <span>{role}</span>
              <span className="animate-blink inline-block h-4 w-[2px] bg-violet-300" aria-hidden="true" />
            </motion.div>

            <motion.p
              variants={fade}
              initial="hidden"
              animate="show"
              custom={0.32}
              className="mt-5 max-w-xl text-[15px] leading-relaxed text-zinc-400 sm:text-base"
            >
              {site.tagline}
            </motion.p>

            <motion.div
              variants={fade}
              initial="hidden"
              animate="show"
              custom={0.4}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <GlowButton href="#now" icon={Activity}>
                See what I&apos;m doing
              </GlowButton>
              {discordProfileUrl ? (
                <GlowButton href={discordProfileUrl} target="_blank" rel="noreferrer" variant="secondary" icon={DiscordIcon}>
                  Discord profile
                </GlowButton>
              ) : (
                <GlowButton href={site.socials.github} target="_blank" rel="noreferrer" variant="secondary" icon={GithubIcon}>
                  GitHub
                </GlowButton>
              )}
              <span className="hidden h-9 w-px bg-white/10 sm:block" />
              {discordProfileUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={site.socials.github}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub profile"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200"
                  >
                    <GithubIcon className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
            </motion.div>

            <motion.div
              variants={fade}
              initial="hidden"
              animate="show"
              custom={0.5}
              className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-white/[0.02] py-4 backdrop-blur"
            >
              <div className="px-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Status</p>
                <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${meta.text}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </p>
              </div>
              <div className="px-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Local time</p>
                <p className="mt-1 font-mono text-sm font-semibold text-zinc-100">{localTime(site.timezone, now)}</p>
              </div>
              <div className="px-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Location</p>
                <p className="mt-1 flex items-center gap-1 truncate text-sm font-semibold text-zinc-100">
                  <MapPin className="h-3.5 w-3.5 text-violet-300" /> {site.location}
                </p>
              </div>
            </motion.div>

            <motion.p
              variants={fade}
              initial="hidden"
              animate="show"
              custom={0.58}
              className="mt-4 flex items-center gap-2 text-xs text-zinc-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Pulled straight from Discord. If it says I&apos;m listening to something, I probably am.
            </motion.p>
          </div>

          {/* ── RIGHT ── */}
          <div className="relative mx-auto w-full max-w-[26rem] lg:mx-0 lg:ml-auto">
            <div
              className="pointer-events-none absolute -right-12 bottom-24 z-0 hidden w-36 rotate-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-1 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] xl:block"
              aria-hidden="true"
            >
              <img
                src="/castorice-side.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                className="h-52 w-full rounded-xl object-cover object-[50%_26%] opacity-90"
              />
            </div>

            <div className="relative z-10">
              <PresenceCard
                presence={presence}
                loading={loading}
                isLive={isLive}
                isDemo={isDemo}
                lastUpdate={lastUpdate}
              />
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-zinc-600">
              <DiscordIcon className="h-3.5 w-3.5 text-indigo-400/70" />
              Discord presence via Lanyard
              <span className="text-zinc-700">·</span>
              <span className="font-mono">{localTime(site.timezone, now)}</span>
            </p>
          </div>
        </div>

        <motion.a
          href="#now"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="mx-auto mt-16 hidden w-fit flex-col items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-zinc-600 transition hover:text-zinc-300 lg:flex"
        >
          Scroll
          <span className="relative h-9 w-5 rounded-full border border-white/15">
            <ArrowDown className="absolute left-1/2 top-1.5 h-3 w-3 -translate-x-1/2 animate-bounce text-zinc-500" />
          </span>
        </motion.a>
      </div>

      <span className="pointer-events-none select-none absolute -bottom-10 right-2 font-display text-[16vw] font-bold leading-none tracking-tighter text-white/[0.015]" aria-hidden="true">
        meroo
      </span>
    </section>
  )
}
