import { ArrowUpRight, Globe, ListVideo, Mail } from 'lucide-react'
import { discordProfileUrl, site } from '../config'
import { avatarUrl, localTime, statusMeta } from '../lib/format'
import { useNow } from '../lib/hooks'
import HudPanel from './HudPanel'
import { DiscordIcon, GithubIcon } from './icons'
import { StatusPill } from './presence-parts'
import ViewsPill from './ViewsPill'

const SKILLS = [
  ...site.skills.Backend.slice(0, 4),
  ...site.skills.Frontend.slice(0, 2),
]

const LINKS = [
  { label: 'GitHub', href: site.socials.github, Icon: GithubIcon },
  { label: 'Discord', href: discordProfileUrl, Icon: DiscordIcon },
  {
    label: 'MAL',
    href: `https://myanimelist.net/profile/${site.myanimelist.username}`,
    Icon: ListVideo,
  },
  { label: 'Website', href: site.socials.website, Icon: Globe },
].filter((link) => Boolean(link.href))

export default function ProfilePanel({ presence, onContact, onReplayTutorial, views, className = '' }) {
  const user = presence?.discord_user
  const status = presence?.discord_status ?? 'offline'
  const meta = statusMeta(status)
  const now = useNow(30_000)

  const displayName = site.name
  const username = user?.username || site.name

  return (
    <HudPanel className={`flex min-h-0 flex-col ${className}`}>
      <div className="relative h-[72px] shrink-0 overflow-hidden border-b border-white/[0.06]">
        <img
          src="/castorice-side.jpg"
          alt=""
          className="h-full w-full object-cover object-[50%_20%] opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0718] via-[#0b0718]/45 to-transparent" />
        <span className="absolute left-4 top-3 font-mono text-[8.5px] font-semibold uppercase tracking-[0.22em] text-violet-200/80">
          player card
        </span>
      </div>

      {/* Kept outside the scroll area so the negative margin can overlap the
          banner without being clipped into a half circle. */}
      <div className="relative z-[2] shrink-0 px-4">
        <div className="-mt-9 flex items-end justify-between gap-2">
          <div className="relative shrink-0">
            <div className="avatar-ring rounded-full p-[2px]">
              <img
                src={avatarUrl(user, 256)}
                alt={`${displayName} avatar`}
                className="h-[68px] w-[68px] rounded-full object-cover ring-4 ring-[#0b0718]"
              />
            </div>
            <span
              className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-[3px] border-[#0b0718]"
              style={{ backgroundColor: meta.color }}
              title={meta.label}
            />
          </div>
          <StatusPill status={status} className="mb-1.5" />
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold leading-none tracking-tight text-white">
          {displayName}
        </h1>
        <p className="mt-1.5 truncate font-mono text-[10px] text-zinc-500">
          @{username} · {meta.label}
        </p>
      </div>

      <div className="hud-scroll relative z-[2] flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
        <p className="mt-3 text-[13px] font-medium leading-snug text-zinc-200">
          {site.role} · aspiring backend dev.
        </p>
        <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-zinc-400">
          {site.hero.tagline}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SKILLS.map((skill) => (
            <span
              key={skill}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[8px] font-medium uppercase tracking-[0.08em] text-zinc-400"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-1.5">
            {LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-zinc-300 transition duration-300 hover:scale-[1.02] hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-white"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                <span className="truncate">{label}</span>
                <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={onContact}
            className="shine group mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-gradient-to-r from-violet-600/85 via-indigo-600/80 to-cyan-600/75 px-3 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white transition duration-300 hover:scale-[1.012] hover:brightness-110"
          >
            <Mail className="relative z-[2] h-3.5 w-3.5" />
            <span className="relative z-[2]">Send a message</span>
          </button>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-600">
            <span>{site.location}</span>
            <span className="font-mono text-zinc-500">{localTime(site.timezone, now)} WIB</span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <ViewsPill
              count={views?.count}
              offline={views?.offline}
              compact
              className="border-0 bg-transparent px-0 py-0"
            />
            {onReplayTutorial ? (
              <button
                type="button"
                onClick={onReplayTutorial}
                title="Replay the tutorial"
                className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-600 transition hover:text-violet-300"
              >
                replay tour
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </HudPanel>
  )
}
