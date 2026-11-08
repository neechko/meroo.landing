import { ArrowUpRight, RefreshCw, Star, WifiOff } from 'lucide-react'
import { site } from '../config'
import { timeAgo } from '../lib/format'
import HudPanel, { HudIconButton, PanelHead } from './HudPanel'
import { GithubIcon } from './icons'

function RepoSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="h-3 w-2/3 rounded bg-white/[0.07]" />
          <div className="mt-2 h-2.5 w-full rounded bg-white/[0.05]" />
          <div className="mt-1.5 h-2.5 w-4/5 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  )
}

function RepoCard({ repo, featured, index = 0 }) {
  const language = repo.language ?? repo.tags?.[0] ?? 'Code'
  const languageColor = repo.languageColor ?? '#a1a1aa'
  const updated = repo.updatedAt ? timeAgo(new Date(repo.updatedAt).getTime()) : null

  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noreferrer"
      style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
      className="card-zoom group block rounded-xl border border-white/[0.07] bg-white/[0.022] p-3 transition duration-300 hover:-translate-y-0.5 hover:scale-[1.012] hover:border-violet-400/30 hover:bg-violet-500/[0.07]"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-display text-[12.5px] font-semibold text-zinc-100 transition group-hover:text-white">
              {repo.title}
            </p>
            {featured ? (
              <span className="shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-300 ring-1 ring-violet-400/25">
                featured
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-zinc-400">
            {repo.description}
          </p>
        </div>
        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300" />
      </div>

      <div className="mt-2 flex items-center gap-2.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: languageColor }} />
          {language}
        </span>
        {repo.stars > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-2.5 w-2.5" />
            {repo.stars}
          </span>
        ) : null}
        {updated ? <span className="ml-auto normal-case tracking-normal">{updated}</span> : null}
      </div>
    </a>
  )
}

export default function GithubPanel({
  repos,
  status,
  error,
  syncedAt,
  onRefresh,
  className = '',
}) {
  const list = (repos?.length ? repos : site.projects).slice(0, site.github.limit)
  const busy = status === 'loading' || status === 'refreshing'

  const note =
    status === 'stale'
      ? 'cached list · github unreachable'
      : syncedAt
        ? `synced ${timeAgo(syncedAt)}`
        : status === 'loading'
          ? 'syncing with github'
          : 'curated fallback'

  return (
    <HudPanel className={`flex min-h-0 flex-col ${className}`}>
      <PanelHead
        icon={GithubIcon}
        title="Things I've built"
        meta={note}
        action={
          <>
            <HudIconButton label="Refresh repositories" onClick={onRefresh} disabled={busy}>
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            </HudIconButton>
            <a
              href={site.socials.github}
              target="_blank"
              rel="noreferrer"
              aria-label="Open GitHub profile"
              title="Open GitHub profile"
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </>
        }
      />

      <div className="hud-scroll relative z-[2] flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
        {status === 'loading' && !repos?.length ? <RepoSkeleton /> : null}

        {list.map((repo, index) => (
          <RepoCard
            key={repo.title ?? repo.url}
            repo={repo}
            index={index}
            featured={index === 0 || site.github.featured.includes(repo.title)}
          />
        ))}

        {status === 'error' ? (
          <div className="mt-1 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error ?? 'GitHub is not reachable.'} Showing saved projects instead.</span>
          </div>
        ) : null}
      </div>

      <div className="relative z-[2] flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-600">
        <span>github.com/{site.github.username}</span>
        <span className="normal-case tracking-normal text-zinc-500">{list.length} repos</span>
      </div>
    </HudPanel>
  )
}
