import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Compass, Sparkles } from 'lucide-react'

export const TUTORIAL_ORDER = ['activity', 'github', 'anime', 'profile']

const COPY = {
  activity: {
    title: 'Live signal',
    body: 'Your Discord presence and current track appear here in real time.',
  },
  github: {
    title: 'Project archive',
    body: 'Repositories sync straight from GitHub, newest first.',
  },
  anime: {
    title: 'Watch log',
    body: 'The MyAnimeList backlog, pulled live from your public list.',
  },
  profile: {
    title: 'Player card',
    body: 'Identity, links, and the live visit counter for this world.',
  },
}

/**
 * Small guided onboarding: every click unlocks one panel, so the HUD assembles
 * itself like a game tutorial instead of appearing all at once. It runs once
 * per browser session; Skip reveals everything immediately.
 */
export default function Tutorial({ revealed, active, onNext, onSkip }) {
  const complete = revealed >= TUTORIAL_ORDER.length
  const nextId = TUTORIAL_ORDER[revealed]
  const next = nextId ? COPY[nextId] : null

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="tutorial"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="tutorial-card fixed bottom-[4.9rem] left-1/2 z-[70] w-[min(92vw,30rem)] -translate-x-1/2 xl:bottom-5"
          role="dialog"
          aria-label="World tutorial"
        >
          <div className="flex items-start gap-3 p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-200">
              <Compass className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-violet-300/80">
                  tutorial · step {Math.min(revealed + 1, TUTORIAL_ORDER.length)} / {TUTORIAL_ORDER.length}
                </p>
                <button
                  type="button"
                  onClick={onSkip}
                  className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300"
                >
                  skip
                </button>
              </div>
              <p className="mt-1 font-display text-[13px] font-semibold text-white">
                {next ? `Unlock ${next.title}` : 'World ready'}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-400">
                {next ? next.body : 'Every panel is online. Click into the world.'}
              </p>

              <div className="mt-2.5 flex items-center gap-1" aria-hidden="true">
                {TUTORIAL_ORDER.map((id, index) => (
                  <span
                    key={id}
                    className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                      index < revealed ? 'bg-gradient-to-r from-violet-400 to-cyan-300' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="shine group flex w-full items-center justify-center gap-2 border-t border-white/[0.06] bg-gradient-to-r from-violet-600/80 via-indigo-600/70 to-cyan-600/60 px-3 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
          >
            <Sparkles className="relative z-[2] h-3.5 w-3.5" />
            <span className="relative z-[2]">
              {complete ? 'Enter the world' : `Reveal ${next?.title ?? 'next panel'}`}
            </span>
            <ArrowRight className="relative z-[2] h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
