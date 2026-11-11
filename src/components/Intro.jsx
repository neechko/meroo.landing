import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { site } from '../config'
import { startBgm } from '../lib/bgm'
import { usePointerParallax } from '../lib/usePointerParallax'

const WORDS = [
  {
    id: 'welcome',
    lines: [
      {
        text: 'welcome to',
        accent: false,
        className: 'text-[clamp(2.2rem,6.2vw,4.4rem)] leading-none',
      },
    ],
  },
  {
    id: 'universe',
    lines: [
      {
        text: 'meroo__',
        accent: true,
        className: 'text-[clamp(2.6rem,7.2vw,5rem)] leading-[0.86]',
      },
      {
        text: 'universe',
        accent: false,
        className:
          'mt-1.5 text-[clamp(0.8rem,2.2vw,1.35rem)] uppercase leading-none tracking-[0.42em] text-zinc-200/85',
      },
    ],
  },
]

const LINK_STEPS = [
  'discord presence',
  'github archive',
  'myanimelist log',
  'world geometry',
]

/**
 * The cold open is now a real "teleport", not a quick fade.
 *
 *   dormant → the screen is almost black and will not move until the visitor
 *             clicks or presses a key. This first gesture also unlocks audio.
 *   waking  → ~2.3s of portal/link boot: the wallpaper wakes up, status lines
 *             tick in, the word flips hello → player, the load bar fills.
 *   ready   → Enter world appears; pressing it runs the warp into the HUD.
 *
 * Skip is always available. Reduced motion jumps straight to ready.
 */
export default function Intro({ onEnter }) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState(reduced ? 'ready' : 'dormant') // dormant | waking | ready
  const [step, setStep] = useState(reduced ? 2 : 0) // 0 hello · 1 player · 2 ready
  const [warping, setWarping] = useState(false)
  const timerRef = useRef(null)
  // sheen: false keeps the opening wallpaper purely transform-driven, which is
  // the smoothest option on older laptops; the parallax itself is the mirror.
  const bgRef = usePointerParallax({ x: 16, y: 12, scale: 1.07, sheen: false })

  const finish = useCallback(() => {
    startBgm()
    onEnter()
  }, [onEnter])

  const wake = useCallback(() => {
    if (warping || phase !== 'dormant') return
    if (reduced) {
      finish()
      return
    }
    setPhase('waking')
  }, [phase, warping, reduced, finish])

  const enter = useCallback(() => {
    if (warping) return
    if (phase === 'dormant') {
      wake()
      return
    }
    if (reduced) {
      finish()
      return
    }
    // The click itself unlocks audio; the delayed onEnter only swaps screens.
    startBgm()
    setWarping(true)
    timerRef.current = window.setTimeout(finish, 1050)
  }, [warping, phase, wake, reduced, finish])

  // Waking timeline: status lines, word flip, then the Enter CTA.
  useEffect(() => {
    if (phase !== 'waking') return undefined
    const timers = [
      window.setTimeout(() => setStep(1), 900),
      window.setTimeout(() => setStep(2), 1750),
      window.setTimeout(() => setPhase('ready'), 2350),
    ]
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [phase])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      if (phase === 'dormant') wake()
      else enter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, wake, enter])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const activeStep = reduced ? 2 : step
  const ready = phase === 'ready' || reduced
  const word = WORDS[Math.min(activeStep, WORDS.length - 1)]
  const statusLabel =
    phase === 'dormant' ? 'system dormant' : phase === 'waking' ? 'linking world' : 'system ready'

  return (
    <motion.div
      className="fixed inset-0 z-[120] overflow-hidden bg-[#04030a]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.01 : 0.3, ease: 'easeOut' }}
    >
      <div
        className={`intro-stage absolute inset-0 is-${phase} ${warping ? 'is-warping' : ''}`}
        onClick={phase === 'dormant' ? wake : undefined}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div ref={bgRef} className="intro-parallax absolute -inset-6">
            <img
              src="/castorice-intro.jpg"
              alt=""
              fetchPriority="high"
              className="intro-bg h-full w-full object-cover object-[50%_22%]"
            />
            <div className="intro-sheen absolute inset-0" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#04030a]/72 via-[#04030a]/80 to-[#04030a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_45%,rgba(124,58,237,0.26),transparent_72%)]" />
          <div className="grid-lines absolute inset-0 opacity-50" />
          <div className="noise absolute inset-0" />
          <div className="intro-scan absolute inset-0" />
          <div className="boot-scanline" aria-hidden="true" />
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
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:inline-flex">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    phase === 'ready'
                      ? 'bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]'
                      : phase === 'waking'
                        ? 'bg-violet-400 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]'
                        : 'bg-zinc-500'
                  }`}
                />
                {statusLabel}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  finish()
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-400 transition hover:border-violet-300/30 hover:text-violet-200"
              >
                skip
              </button>
            </div>
          </div>

          <div className="intro-copy flex flex-1 flex-col items-center justify-center px-6">
            <div
              className={`intro-word-wrap relative flex h-[clamp(6.25rem,21vh,10rem)] w-full items-center justify-center ${
                phase === 'dormant' ? 'is-dim' : ''
              }`}
            >
              <AnimatePresence>
                <motion.div
                  key={word.id}
                  initial={
                    reduced
                      ? false
                      : { opacity: 0, y: 24, filter: 'blur(18px)', letterSpacing: '0.16em' }
                  }
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '-0.015em' }}
                  exit={
                    reduced
                      ? undefined
                      : { opacity: 0, y: -22, filter: 'blur(18px)', letterSpacing: '0.1em' }
                  }
                  transition={{ duration: reduced ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="intro-word absolute flex select-none flex-col items-center justify-center text-center font-display font-bold tracking-tight"
                >
                  {word.lines.map((line) => (
                    <span
                      key={line.text}
                      className={`${line.className} whitespace-nowrap ${
                        line.accent ? 'text-gradient' : 'text-white'
                      }`}
                      style={{
                        textShadow: line.accent
                          ? '0 0 70px rgba(167,139,250,0.45)'
                          : '0 0 60px rgba(196,181,253,0.3)',
                      }}
                    >
                      {line.text}
                    </span>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative mt-2 flex min-h-[10.5rem] w-full max-w-md flex-col items-center justify-start text-center">
              <AnimatePresence mode="wait">
                {phase === 'dormant' ? (
                  <motion.div
                    key="dormant"
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        wake()
                      }}
                      className="intro-prompt group"
                      aria-label="Open the portal and connect to the world"
                    >
                      <span className="intro-prompt-text">open the portal</span>
                    </button>
                  </motion.div>
                ) : ready ? (
                  <motion.div
                    key="ready"
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center"
                  >
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-zinc-400">
                      the world is waiting
                    </p>

                    <motion.button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        enter()
                      }}
                      disabled={warping}
                      whileHover={reduced ? undefined : { scale: 1.03 }}
                      whileTap={reduced ? undefined : { scale: 0.97 }}
                      className="shine group relative mt-4 inline-flex items-center gap-3 rounded-full border border-violet-300/35 bg-[linear-gradient(180deg,rgba(109,40,217,0.92),rgba(49,24,95,0.96)_55%,rgba(18,9,38,0.98))] px-7 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-50 shadow-[0_20px_60px_-22px_rgba(139,92,246,0.95),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-cyan-300/15 transition hover:border-cyan-300/45 hover:text-white hover:shadow-[0_24px_70px_-20px_rgba(103,232,249,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:cursor-wait"
                    >
                      <span className="relative z-[2]">{warping ? 'entering…' : 'Enter world'}</span>
                      <ArrowRight className="relative z-[2] h-4 w-4 text-cyan-200 transition-transform duration-300 group-hover:translate-x-1" />
                    </motion.button>

                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                      press enter · audio unlocked
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="flex flex-col items-center"
                  >
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-violet-200/80">
                      establishing link…
                    </p>
                    <ul className="intro-log" aria-hidden="true">
                      {LINK_STEPS.map((label, index) => (
                        <li key={label} style={{ animationDelay: `${120 + index * 380}ms` }}>
                          <span>{label}</span>
                          <span>ok</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-8">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-4 border-t border-white/[0.06] pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              <span>
                {phase === 'dormant'
                  ? 'link dormant'
                  : phase === 'waking'
                    ? 'establishing link'
                    : 'world ready'}
              </span>
              <span className="hidden sm:inline">github sync</span>
              <span className="hidden sm:inline">myanimelist</span>
              <span className="flex items-center gap-1.5 text-emerald-400/80">
                <span
                  className={`h-1 w-1 rounded-full ${
                    phase === 'dormant' ? 'bg-zinc-500' : 'bg-emerald-400'
                  }`}
                />
                {phase === 'dormant' ? 'standby' : 'online'}
              </span>
            </div>
            <div className="mx-auto mt-3 h-px max-w-xl overflow-hidden rounded-full bg-white/[0.06]">
              <div className="intro-load h-full w-full origin-left bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
