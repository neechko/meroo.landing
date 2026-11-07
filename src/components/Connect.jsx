import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Copy, Mail, Send } from 'lucide-react'
import { discordProfileUrl, site } from '../config'
import { avatarUrl, statusMeta } from '../lib/format'
import { DiscordIcon, GithubIcon, SpotifyIcon } from './icons'
import { CustomStatus, StatusPill } from './presence-parts'
import { Equalizer, GlowButton, Reveal } from './ui'

function CopyUsername() {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.name)
    } catch {
      const input = document.createElement('textarea')
      input.value = site.name
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5 pl-4 backdrop-blur">
      <span className="text-sm font-medium text-zinc-500">@</span>
      <span className="flex-1 truncate text-sm font-semibold text-white">{site.name}</span>
      <button
        type="button"
        onClick={copy}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 ${
          copied
            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
            : 'bg-white/[0.07] text-zinc-200 hover:bg-white/[0.12]'
        }`}
        aria-label="Copy Discord username"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function ChatPreview({ presence }) {
  const user = presence?.discord_user
  const spotify = presence?.listening_to_spotify ? presence.spotify : null
  const meta = statusMeta(presence?.discord_status ?? 'offline')

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src={avatarUrl(user, 64)}
            alt=""
            className="h-8 w-8 rounded-full ring-1 ring-white/15"
          />
          <div>
            <p className="text-xs font-semibold text-white">{user?.global_name || user?.username || site.name}</p>
            <p className={`flex items-center gap-1 text-[10px] ${meta.text}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </p>
          </div>
        </div>
        <DiscordIcon className="h-4 w-4 text-indigo-300/70" />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-end gap-2">
          <img src={avatarUrl(user, 64)} alt="" className="h-6 w-6 rounded-full" />
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.05] px-3.5 py-2.5">
            <p className="text-[13px] leading-relaxed text-zinc-200">
              Hey, thanks for stopping by 👋
              <br />
              Want to talk about web, projects, or music? Just DM me.
            </p>
            <span className="mt-1 block text-[9px] text-zinc-600">just now</span>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="h-6 w-6" />
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.05] px-3.5 py-2.5">
            <p className="text-[13px] leading-relaxed text-zinc-200">
              I&apos;m usually around at night 🌙 Don&apos;t overthink the first message.
            </p>
          </div>
        </div>

        {spotify ? (
          <div className="ml-8 flex items-center gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2">
            <SpotifyIcon className="h-4 w-4 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-zinc-100">{spotify.song}</p>
              <p className="truncate text-[10px] text-zinc-400">{spotify.artist}</p>
            </div>
            <Equalizer className="h-3 text-emerald-400" />
          </div>
        ) : null}

        <CustomStatus presence={presence} className="pl-8 text-xs text-zinc-500" />
      </div>

      <div className="border-t border-white/[0.07] p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5">
          <span className="flex-1 truncate text-xs text-zinc-600">Message {site.name}…</span>
          <Send className="h-3.5 w-3.5 text-zinc-600" />
        </div>
      </div>
    </div>
  )
}

export default function Connect({ presence }) {
  const socials = [{ href: site.socials.github, label: 'GitHub', Icon: GithubIcon }]

  return (
    <section id="contact" className="relative scroll-mt-28 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#170d2e] via-[#0b0717] to-[#08131f] p-px">
            <div className="relative overflow-hidden rounded-[31px] bg-[#08050f]/85 p-6 backdrop-blur-xl sm:p-10">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

              <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-violet-300/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_2px_rgba(167,139,250,.8)]" />
                    Contact
                  </span>
                  <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[2.7rem] md:leading-[1.08]">
                    Come say hi on <span className="text-gradient">Discord</span>.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
                    Discord is the fastest way to reach me. Add{' '}
                    <strong className="font-semibold text-zinc-200">{site.name}</strong> or use the button below. You
                    will see the same status as the live card.
                  </p>

                  <div className="mt-6">
                    <CopyUsername />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {discordProfileUrl ? (
                      <GlowButton href={discordProfileUrl} target="_blank" rel="noreferrer" icon={DiscordIcon}>
                        Open Discord profile
                      </GlowButton>
                    ) : (
                      <GlowButton href={site.socials.github} target="_blank" rel="noreferrer" icon={GithubIcon}>
                        Find me on GitHub
                      </GlowButton>
                    )}
                    {site.email ? (
                      <GlowButton href={`mailto:${site.email}`} variant="secondary" icon={Mail}>
                        Send an email
                      </GlowButton>
                    ) : null}
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    {socials.map(({ href, label, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${label} profile`}
                        className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                    ))}
                  </div>

                  <p className="mt-6 flex items-center gap-2 text-[11px] text-zinc-600">
                    <StatusPill status={presence?.discord_status ?? 'offline'} />
                    <span className="hidden sm:inline">The status above updates on its own.</span>
                  </p>
                </div>

                <ChatPreview presence={presence} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
