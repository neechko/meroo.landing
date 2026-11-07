import { Coffee, Headphones, MapPin, Moon, Sparkles, Terminal as TerminalIcon } from 'lucide-react'
import { site } from '../config'
import { statusMeta } from '../lib/format'
import { Reveal, SectionHeading, SpotlightCard } from './ui'

const MARQUEE = [
  'React',
  'TypeScript',
  'Node.js',
  'Tailwind CSS',
  'Framer Motion',
  'PostgreSQL',
  'Vite',
  'Figma',
  'Discord API',
  'Spotify API',
  'Lanyard',
  'Next.js',
]

function TerminalCard({ presence }) {
  const spotify = presence?.listening_to_spotify ? presence.spotify : null
  const activity = (presence?.activities ?? []).find((item) => item.type !== 4)
  const meta = statusMeta(presence?.discord_status ?? 'offline')
  const nowDoing = spotify
    ? `${spotify.song} — ${spotify.artist}`
    : activity?.name ?? 'taking a break, nothing running'

  return (
    <div className="glass-strong overflow-hidden rounded-3xl">
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
          <TerminalIcon className="h-3 w-3" /> {site.displayName}@discord — zsh
        </span>
      </div>

      <div className="space-y-2 p-5 font-mono text-[12.5px] leading-relaxed">
        <p>
          <span className="text-emerald-400">➜</span> <span className="text-cyan-300">~</span>{' '}
          <span className="text-zinc-200">whoami</span>
        </p>
        <p className="pl-4 text-zinc-400">
          {site.name} <span className="text-zinc-600">·</span> {site.role.toLowerCase()}
        </p>

        <p className="pt-2">
          <span className="text-emerald-400">➜</span> <span className="text-cyan-300">~</span>{' '}
          <span className="text-zinc-200">cat now-playing.txt</span>
        </p>
        <p className="truncate pl-4 text-violet-300">{nowDoing}</p>

        <p className="pt-2">
          <span className="text-emerald-400">➜</span> <span className="text-cyan-300">~</span>{' '}
          <span className="text-zinc-200">status --discord</span>
        </p>
        <p className="pl-4 text-zinc-400">
          <span className={meta.text}>{meta.label.toLowerCase()}</span> <span className="text-zinc-600">·</span>{' '}
          {presence ? (
            <>
              connected via <span className="text-indigo-300">Lanyard</span>
            </>
          ) : (
            <>waiting for <span className="text-indigo-300">Lanyard</span></>
          )}
          <span className="animate-blink ml-1 inline-block h-3.5 w-[7px] translate-y-0.5 bg-violet-300" />
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4 font-sans text-[10px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
            <Coffee className="h-3 w-3 text-amber-300" /> coffee-powered
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
            <Moon className="h-3 w-3 text-violet-300" /> night owl
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
            <Headphones className="h-3 w-3 text-emerald-300" /> lo-fi on repeat
          </span>
        </div>
      </div>
    </div>
  )
}

export default function About({ presence }) {
  return (
    <section id="about" className="relative scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <Reveal>
            <SectionHeading
              eyebrow="About"
              title={
                <>
                  A developer who cares about the{' '}
                  <span className="text-gradient-soft">small stuff</span>.
                </>
              }
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              {site.bio.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-violet-300" /> {site.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" /> open to collabs
                </span>
                <span className="font-mono">{site.timezone}</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <TerminalCard presence={presence} />
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
            {Object.entries(site.skills).map(([group, items], index) => (
              <Reveal key={group} delay={0.06 * index}>
                <SpotlightCard tilt={false} className="h-full">
                  <div className="glass h-full rounded-3xl p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{group}</h3>
                      <span className="font-mono text-[10px] text-zinc-600">0{index + 1}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {items.map((item) => (
                        <span
                          key={item}
                          className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors duration-200 hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="marquee relative mt-16 overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee-track items-center gap-8">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-8" aria-hidden={copy === 1}>
              {MARQUEE.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="inline-flex items-center gap-8 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500"
                >
                  {item}
                  <Sparkles className="h-3 w-3 text-violet-400/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
