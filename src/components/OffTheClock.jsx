import { Gamepad2, Headphones, Moon, Sparkles } from 'lucide-react'
import { site } from '../config'
import { Chip, Reveal, SectionHeading } from './ui'

const TINY_NOTES = [
  { Icon: Moon, text: '2am is a normal hour' },
  { Icon: Gamepad2, text: 'bad aim, good intentions' },
  { Icon: Headphones, text: 'one song on repeat' },
]

export default function OffTheClock() {
  return (
    <section id="off-clock" className="relative scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.02fr] lg:gap-16">
          <div>
            <Reveal>
              <SectionHeading
                eyebrow="Off the clock"
                title={
                  <>
                    Away from the <span className="text-gradient">keyboard</span>.
                  </>
                }
                description={site.offTheClock.description}
              />
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-6 flex flex-wrap gap-2">
                {site.offTheClock.tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mt-8 space-y-3 border-l border-white/10 pl-5">
                {TINY_NOTES.map(({ Icon, text }) => (
                  <p key={text} className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <Icon className="h-4 w-4 text-violet-300" />
                    {text}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-8 max-w-sm text-sm leading-relaxed text-zinc-500">
                {site.offTheClock.note}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="absolute -left-5 top-10 hidden h-[78%] w-[76%] rotate-[-4deg] rounded-[32px] border border-white/10 bg-white/[0.02] sm:block"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-violet-400/35 via-white/10 to-cyan-300/25 p-px shadow-[0_40px_120px_-45px_rgba(88,28,135,0.95)]">
                <div className="relative overflow-hidden rounded-[31px] bg-[#0a0617]">
                  <img
                    src="/castorice-hero.jpg"
                    alt={`${site.anime.character} from ${site.anime.source}`}
                    loading="lazy"
                    decoding="async"
                    className="h-[26rem] w-full object-cover object-[50%_20%] sm:h-[30rem]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,4,15,0.08),transparent_40%,rgba(6,4,15,0.88))]" />
                  <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />

                  <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                        {site.anime.label}
                      </p>
                      <p className="mt-0.5 truncate font-display text-base font-semibold text-white">
                        {site.anime.character}
                      </p>
                      <p className="truncate text-[11px] text-zinc-400">{site.anime.source}</p>
                    </div>
                    <img
                      src="/castorice5.jpg"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
                    />
                  </div>
                </div>
              </div>

              <div className="glass animate-float absolute -left-4 top-8 hidden items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[11px] font-medium text-zinc-200 shadow-xl sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                no deadlines here
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
