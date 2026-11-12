import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, MessageCircle, MousePointer2, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CastoriceGlyph, SparkGlyph } from './icons'

const DIALOGUE = [
  'There you are. I was starting to wonder where you went.',
  'You came back. I kept the light on for you.',
  'Take your time. There is no rush here.',
  'You look tired. Sit with me for a while.',
  'I am not going anywhere. Tell me how your day went.',
  'Stay a little longer. I will keep you company.',
]

// One facial pose per line, so the expression follows the conversation.
const MOODS = ['gentle', 'shy', 'gentle', 'trouble', 'shy', 'gentle']

const STATS = [
  { label: 'Path', value: 'Remembrance' },
  { label: 'Element', value: 'Quantum' },
  { label: 'Rarity', value: '5 star' },
  { label: 'Version', value: '3.2' },
]

export default function CastoriceViewer({ onClose }) {
  const reduced = Boolean(useReducedMotion())
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const lineRef = useRef(0)
  const [line, setLine] = useState(0)
  const [typed, setTyped] = useState(() => (reduced ? DIALOGUE[0] : ''))
  const [typing, setTyping] = useState(() => !reduced)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneError, setSceneError] = useState(false)

  const currentLine = DIALOGUE[line]

  const goToLine = useCallback(
    (next) => {
      setLine(next)
      setTyped(reduced ? DIALOGUE[next] : '')
      setTyping(!reduced)
    },
    [reduced],
  )

  const advance = useCallback(() => {
    if (typing) {
      setTyped(currentLine)
      setTyping(false)
      return
    }
    goToLine((line + 1) % DIALOGUE.length)
  }, [currentLine, goToLine, line, typing])

  const talkRef = useRef(advance)
  useEffect(() => {
    talkRef.current = advance
  }, [advance])

  // Typewriter: a short, readable reveal rather than a wall of text.
  useEffect(() => {
    if (reduced) return undefined
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setTyped(currentLine.slice(0, index))
      if (index >= currentLine.length) {
        window.clearInterval(timer)
        setTyping(false)
      }
    }, 22)
    return () => window.clearInterval(timer)
  }, [currentLine, reduced])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let cancelled = false
    let scene

    import('../lib/castoriceScene')
      .then(({ createCastoriceScene }) => {
        if (cancelled) return
        scene = createCastoriceScene(canvas, {
          reduced,
          onTalk: () => talkRef.current(),
          onModelReady: () => {
            if (!cancelled) setSceneReady(true)
          },
          onModelError: () => {
            if (!cancelled) setSceneError(true)
          },
        })
        sceneRef.current = scene
        scene.setExpression(MOODS[lineRef.current])
      })
      .catch(() => {
        if (!cancelled) setSceneError(true)
      })

    return () => {
      cancelled = true
      if (sceneRef.current === scene) sceneRef.current = null
      scene?.dispose()
    }
  }, [reduced])

  // Only the expression changes with the line. Her body stays in the same
  // quiet idle the whole time — gestures read as stiff on a static portrait.
  useEffect(() => {
    lineRef.current = line
    sceneRef.current?.setExpression(MOODS[line])
  }, [line])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[135] grid place-items-center p-3 sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close Castorice"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#04030a]/85 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="castorice-title"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="hud-panel relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-lg border border-white/[0.12] bg-[#05030c]/70 text-zinc-300 backdrop-blur transition hover:border-white/25 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative min-h-[360px] flex-1 overflow-hidden bg-[#070411] lg:min-h-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_52%_at_50%_38%,rgba(124,58,237,0.26),transparent_70%)]" />
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />

          <canvas
            ref={canvasRef}
            className="castorice-canvas absolute inset-0 h-full w-full touch-none"
            aria-label="Interactive 3D Castorice figure"
          />

          {!sceneReady && !sceneError ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <CastoriceGlyph className="h-6 w-6 animate-pulse text-violet-300" />
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
                  loading the 3d model…
                </p>
              </div>
            </div>
          ) : null}

          {sceneError ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
              <p className="max-w-[18rem] text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-zinc-500">
                the archive model could not be loaded
              </p>
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-cyan-200">
              <SparkGlyph className="h-3 w-3" />
              3D · live
            </span>
            <span className="mr-9 hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-400 sm:inline-flex">
              <MousePointer2 className="h-3 w-3" />
              drag to turn · click to talk
            </span>
          </div>

          {/* Visual-novel dialogue box. Clicking it advances the line; the
              canvas below handles drag-to-orbit and click-to-talk. */}
          <div className="absolute inset-x-3 bottom-3 z-20">
            <div
              role="button"
              tabIndex={0}
              onClick={advance}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  advance()
                }
              }}
              className="cursor-pointer rounded-xl border border-violet-300/20 bg-[#05030c]/88 p-3.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.95)] backdrop-blur-md transition hover:border-violet-300/35"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]" />
                  <p className="font-display text-[13px] font-semibold tracking-tight text-white">
                    Castorice
                  </p>
                </div>
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                  {line + 1} / {DIALOGUE.length}
                </span>
              </div>

              <p
                aria-live="polite"
                className="mt-1.5 min-h-[3.1rem] text-[12.5px] leading-relaxed text-zinc-200"
              >
                {typed}
                {typing ? (
                  <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-violet-300 align-middle" />
                ) : null}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                  click or press enter
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-violet-200">
                  {typing ? 'skip' : 'next'}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hud-scroll relative z-[2] flex min-h-0 flex-col overflow-y-auto border-t border-white/[0.06] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]" />
            <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-violet-300/80">
              honkai: star rail
            </p>
          </div>

          <h2 id="castorice-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
            Castorice
          </h2>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
            playable character
          </p>

          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2"
              >
                <p className="font-mono text-[7.5px] uppercase tracking-[0.18em] text-zinc-600">
                  {stat.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-100">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-violet-300/15 bg-violet-500/[0.06] p-3">
            <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-violet-200/80">
              <MessageCircle className="h-3 w-3" />
              conversation
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
              Talk to her, or start over whenever you like.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:bg-violet-500/25 active:scale-95"
              >
                <MessageCircle className="h-3 w-3" />
                {typing ? 'Skip line' : 'Keep talking'}
              </button>
              <button
                type="button"
                onClick={() => goToLine(0)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/25 hover:text-white active:scale-95"
              >
                <RotateCcw className="h-3 w-3" />
                Start over
              </button>
            </div>
          </div>

          <a
            href="https://honkai-star-rail.fandom.com/wiki/Castorice"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.03] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            Character sheet
          </a>

          <div className="mt-auto pt-4">
            <p className="font-mono text-[7.5px] leading-relaxed tracking-[0.02em] text-zinc-600">
              This work is based on{' '}
              <a
                href="https://sketchfab.com/3d-models/castorice-206928135bbf4fdea8fa7e6ad80bd084"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-500 underline decoration-white/20 underline-offset-2 transition hover:text-zinc-300"
              >
                “Castorice”
              </a>{' '}
              by{' '}
              <a
                href="https://sketchfab.com/layfray"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-500 underline decoration-white/20 underline-offset-2 transition hover:text-zinc-300"
              >
                frey
              </a>
              , licensed under{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-500 underline decoration-white/20 underline-offset-2 transition hover:text-zinc-300"
              >
                CC-BY-4.0
              </a>
              .
            </p>
            <p className="mt-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-zinc-600">
              drag to turn · arrow keys rotate · esc closes
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
