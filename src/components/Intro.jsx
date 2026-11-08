import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { site } from '../config'

/**
 * The "gate" before the HUD. It exists for two reasons:
 *  1. The concept needs a moment of entering a game world.
 *  2. A real click means the browser will allow audio later, when the visitor
 *     presses play on a track.
 *
 * Pressing the button starts a short warp sequence (flash, tunnel, rings,
 * sweep) and only then reveals the HUD, so the zoom-in is actually visible.
 */
export default function Intro({ onEnter }) {
  const reduced = useReducedMotion()
  const [warping, setWarping] = useState(false)
  const timerRef = useRef(null)

  const begin = useCallback(() => {
    if (warping) return
    if (reduced) {
      onEnter()
      return
    }
    setWarping(true)
    timerRef.current = window.setTimeout(onEnter, 820)
  }, [onEnter, reduced, warping])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        begin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [begin])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  return (
    <motion.div
      className="fixed inset-0 z-[120] overflow-hidden bg-[#05030c]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.01 : 0.3, ease: 'easeOut' }}
    >
      <div className={`intro-stage absolute inset-0 ${warping ? 'is-warping' : ''}`}>
        <div className="absolute inset-0">
          <img
            src="/castorice-hero.jpg"
            alt=""
            className="intro-bg h-full w-full object-cover object-[50%_24%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05030c]/60 via-[#05030c]/72 to-[#05030c]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_45%,rgba(124,58,237,0.24),transparent_72%)]" />
          <div className="grid-lines absolute inset-0 opacity-60" />
          <div className="noise absolute inset-0" />
          <div className="intro-scan absolute inset-0" />
        </div>

        <div className="intro-tunnel" aria-hidden="true" />
        <div className="intro-streaks" aria-hidden="true" />
        <div className="intro-flash" aria-hidden="true" />
        <div className="intro-rings" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="intro-sweep" aria-hidden="true" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-8">
            <div className="flex items-center gap-2.5">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-violet-300/40 shadow-[0_0_22px_-4px_rgba(168,85,247,0.8)]">
                <img src="/profile.jpg" alt="" className="h-full w-full object-cover" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-600/35 via-transparent to-cyan-300/25" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold tracking-tight text-white">
                  {site.name}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-zinc-500">
                  world gate
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
              system ready
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-6">
            <motion.div
              className="intro-copy w-full max-w-xl text-center"
              initial={reduced ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                <Sparkles className="h-3 w-3" />
                sector 07 · player one
              </span>

              <h1 className="mt-6 font-display text-[clamp(3rem,10vw,6rem)] font-bold leading-[0.9] tracking-tight text-white [text-shadow:0_0_42px_rgba(167,139,250,0.35)]">
                meroo<span className="text-gradient">__</span>
              </h1>

              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-zinc-300 sm:text-base">
                {site.hero.headline}
              </p>

              <p className="mx-auto mt-2 max-w-md font-mono text-[10px] leading-relaxed uppercase tracking-[0.12em] text-zinc-500">
                {site.role} · {site.location} · still playing the game of life
              </p>

              <motion.button
                type="button"
                onClick={begin}
                disabled={warping}
                whileHover={reduced ? undefined : { scale: 1.03 }}
                whileTap={reduced ? undefined : { scale: 0.97 }}
                className="shine group relative mt-9 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-7 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_20px_60px_-18px_rgba(168,85,247,0.95)] ring-1 ring-white/20 transition-shadow hover:shadow-[0_24px_70px_-14px_rgba(217,70,239,0.9)] disabled:cursor-wait"
              >
                <span className="relative z-[2]">
                  {warping ? 'entering…' : 'Enter world'}
                </span>
                <ArrowRight className="relative z-[2] h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>

              <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                press enter · music embeds unlock after you enter
              </p>
            </motion.div>
          </div>

          <div className="px-5 pb-5 sm:px-8">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-4 border-t border-white/[0.06] pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              <span>discord link</span>
              <span className="hidden sm:inline">github sync</span>
              <span className="hidden sm:inline">myanimelist</span>
              <span className="flex items-center gap-1.5 text-emerald-400/80">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                online
              </span>
            </div>
            <div className="mx-auto mt-3 h-px max-w-xl overflow-hidden rounded-full bg-white/[0.06]">
              <div className="intro-load h-full w-full origin-left bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
