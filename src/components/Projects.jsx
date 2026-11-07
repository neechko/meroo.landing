import { Activity, ArrowUpRight, Layers, Sparkles } from 'lucide-react'
import { site } from '../config'
import { GithubIcon } from './icons'
import { GlowButton, Reveal, SectionHeading, SpotlightCard } from './ui'

const ICONS = { activity: Activity, github: GithubIcon, layers: Layers }

export default function Projects() {
  return (
    <section id="projects" className="relative scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Projects"
            title={
              <>
                Things I&apos;ve built, or am still <span className="text-gradient">poking at</span>.
              </>
            }
            description="A mix of experiments, small tools, and whatever I got curious about that week. Most links go straight to GitHub."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {site.projects.map((project, index) => {
            const Icon = ICONS[project.icon] ?? Sparkles
            const isPlaceholder = !project.url || project.url === '#'

            return (
              <Reveal key={project.title} delay={index * 0.08}>
                <SpotlightCard className="h-full" glow="rgba(167,139,250,0.2)">
                  <a
                    href={project.url}
                    target={isPlaceholder ? undefined : '_blank'}
                    rel={isPlaceholder ? undefined : 'noreferrer'}
                    onClick={isPlaceholder ? (event) => event.preventDefault() : undefined}
                    className="glass flex h-full flex-col overflow-hidden rounded-3xl transition-colors duration-300 hover:border-white/20"
                  >
                    <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${project.accent}`}>
                      <div className="absolute inset-0 bg-[#08050f]/55" />
                      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />
                      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border border-white/20" />
                      <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full border border-white/15" />

                      <div className="absolute inset-0 flex items-center justify-between p-5">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                          0{index + 1}
                        </span>
                      </div>

                      <span className="absolute bottom-4 left-5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur">
                        {isPlaceholder ? 'in progress' : 'live'}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-white">
                        {project.title}
                      </h3>
                      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-zinc-400">{project.description}</p>

                      <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 transition-colors duration-300 group-hover:text-violet-200">
                        {isPlaceholder ? 'Still in progress' : 'View project'}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </a>
                </SpotlightCard>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="glass relative mt-6 flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl p-6 sm:flex-row sm:items-center sm:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(139,92,246,0.16),transparent_55%)]" />
            <div className="relative">
              <h3 className="font-display text-lg font-semibold text-white">Got something in mind?</h3>
              <p className="mt-1 text-sm text-zinc-400">
                I&apos;m open to freelance work, collabs, or just talking about the web and music.
              </p>
            </div>
            <GlowButton href="#contact" className="relative shrink-0">
              Get in touch
            </GlowButton>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
