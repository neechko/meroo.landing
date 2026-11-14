import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TUTORIAL_ORDER } from '../lib/tutorial'

/**
 * Castorice walks the visitor through the HUD one panel at a time. The copy is
 * written as a quiet visual-novel conversation rather than a product tour, so
 * the guide feels like the same character as the archive.
 */
const STEPS = [
  {
    id: 'activity',
    label: 'live signal',
    portrait: '/png/castorice-gentle.webp',
    body: 'This is where your presence lives. I keep it lit for you — what you are playing, what you are listening to. It reaches me here, quietly.',
  },
  {
    id: 'github',
    label: 'project archive',
    portrait: '/png/castorice-calm.webp',
    body: 'Every project you finish finds its way back to this shelf. I put the newest ones first, so you can see how far you have come.',
  },
  {
    id: 'anime',
    label: 'watch log',
    portrait: '/png/castorice-shy.webp',
    body: 'The stories you keep are here too. I will not judge how many episodes you watch in one night. …I might remember, though.',
  },
  {
    id: 'profile',
    label: 'player card',
    portrait: '/png/castorice-trouble.webp',
    body: 'And this is you. Your name, your links, every visitor who has passed through. I remember them all — and I remember you most.',
  },
]

export default function Tutorial({ revealed, active, onNext, onSkip }) {
  const reduced = Boolean(useReducedMotion())
  const stepIndex = Math.min(Math.max(revealed - 1, 0), STEPS.length - 1)
  const step = STEPS[stepIndex]
  const complete = revealed >= TUTORIAL_ORDER.length

  const [typed, setTyped] = useState(() => (reduced ? step.body : ''))
  const [typing, setTyping] = useState(() => !reduced)

  useEffect(() => {
    if (!active || reduced) return undefined

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setTyped(step.body.slice(0, index))
      if (index >= step.body.length) {
        window.clearInterval(timer)
        setTyping(false)
      }
    }, 18)

    return () => window.clearInterval(timer)
  }, [active, reduced, step.body])

  const advance = () => {
    if (typing) {
      setTyped(step.body)
      setTyping(false)
      return
    }
    onNext()
  }

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="tutorial"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="tutorial-card tutorial-vn fixed bottom-[4.9rem] left-1/2 z-[70] w-[min(94vw,36rem)] -translate-x-1/2 xl:bottom-5"
          role="dialog"
          aria-label="Tutorial with Castorice"
        >
          <div className="tutorial-vn-stage">
            <div className="tutorial-vn-portrait" aria-hidden="true">
              <AnimatePresence mode="wait">
                <motion.img
                  key={step.id}
                  src={step.portrait}
                  alt=""
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                  className="tutorial-vn-img"
                />
              </AnimatePresence>
            </div>

            <div className="tutorial-vn-body">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300 shadow-[0_0_10px_2px_rgba(167,139,250,0.7)]" />
                  <p className="font-display text-[13px] font-semibold tracking-tight text-white">
                    Castorice
                  </p>
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-violet-300/70">
                    guide
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onSkip}
                  className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300"
                >
                  skip
                </button>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-violet-300/80">
                  {step.label}
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                  {stepIndex + 1} / {STEPS.length}
                </p>
              </div>

              <p
                aria-live="polite"
                className="mt-1.5 min-h-[3.9rem] text-[12px] leading-relaxed text-zinc-200"
              >
                {typed}
                {typing ? (
                  <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-violet-300 align-middle" />
                ) : null}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                <div className="flex flex-1 items-center gap-1" aria-hidden="true">
                  {TUTORIAL_ORDER.map((id, index) => (
                    <span
                      key={id}
                      className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                        index < revealed
                          ? 'bg-gradient-to-r from-violet-400 to-cyan-300'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={advance}
                  data-sfx={complete ? 'confirm' : 'tab'}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:bg-violet-500/25 active:scale-95"
                >
                  {typing ? 'continue' : complete ? 'enter' : 'next'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
