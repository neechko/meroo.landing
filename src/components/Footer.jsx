import { ArrowUp, Heart } from 'lucide-react'
import { discordProfileUrl, site } from '../config'
import { DiscordIcon, GithubIcon } from './icons'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <a href="#home" className="group flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 font-display text-base font-bold text-white ring-1 ring-white/20">
              <img
                src="/profile.jpg"
                alt="Logo"
                className="h-full w-full object-cover"
              />
            </span>
            <div className="text-left">
              <p className="font-display text-sm font-semibold text-white">{site.name}</p>
              <p className="text-[10px] text-zinc-600">
                © {YEAR} · built with React, Tailwind &amp; Lanyard
              </p>
            </div>
          </a>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-500">
            <a href="#now" className="transition-colors hover:text-white">
              Now
            </a>
            <a href="#about" className="transition-colors hover:text-white">
              About
            </a>
            <a href="#off-clock" className="transition-colors hover:text-white">
              Off Clock
            </a>
            <a href="#projects" className="transition-colors hover:text-white">
              Projects
            </a>
            <a href="#contact" className="transition-colors hover:text-white">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={site.socials.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub profile"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:text-violet-200"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            {discordProfileUrl ? (
              <a
                href={discordProfileUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Discord profile"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:text-indigo-200"
              >
                <DiscordIcon className="h-4 w-4" />
              </a>
            ) : null}
            <a
              href="#home"
              className="group inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:text-violet-200"
            >
              Back to top
              <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-zinc-700">
          Made with <Heart className="inline h-3 w-3 -translate-y-px text-fuchsia-500/70" /> and too much coffee.
          Discord presence by{' '}
          <a
            href="https://lanyard.rest"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-300"
          >
            Lanyard
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
