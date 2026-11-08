import { useState } from 'react'
import { ArrowUpRight, ListVideo, RefreshCw, WifiOff } from 'lucide-react'
import { site } from '../config'
import { timeAgo } from '../lib/format'
import HudPanel, { HudIconButton, PanelHead } from './HudPanel'

function Cover({ entry }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/15 to-indigo-600/25">
      {entry.image && !failed ? (
        <img
          src={entry.image}
          alt={entry.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-1 text-center text-[8px] uppercase tracking-wider text-zinc-400">
          {entry.title}
        </span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      {entry.airing ? (
        <span className="absolute left-1 top-1 rounded bg-emerald-500/85 px-1 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-emerald-950">
          air
        </span>
      ) : null}
      <span className="absolute inset-x-1 bottom-1 truncate font-mono text-[8px] font-semibold text-white/90">
        ep {entry.watched}
        {entry.total ? `/${entry.total}` : ''}
      </span>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/15">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300"
          style={{
            width: `${entry.total ? Math.min(100, (entry.watched / entry.total) * 100) : 12}%`,
          }}
        />
      </div>
    </div>
  )
}

function AnimeSkeleton() {
  return (
    <div className="flex animate-pulse gap-2">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div key={index} className="w-[78px] shrink-0 xl:w-[88px]">
          <div className="aspect-[2/3] rounded-lg bg-white/[0.05]" />
          <div className="mt-1.5 h-2 w-4/5 rounded bg-white/[0.05]" />
          <div className="mt-1 h-2 w-3/5 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  )
}

export default function AnimePanel({
  entries,
  watching,
  status,
  error,
  updatedAt,
  onRefresh,
  className = '',
}) {
  const list = entries ?? []
  const busy = status === 'loading' || status === 'refreshing'
  const note =
    status === 'loading'
      ? 'loading list'
      : updatedAt
        ? `updated ${timeAgo(updatedAt)}`
        : status === 'error'
          ? 'list unavailable'
          : 'myanimelist'

  return (
    <HudPanel className={`flex min-h-0 flex-col ${className}`}>
      <PanelHead
        icon={ListVideo}
        title="Now watching"
        meta={watching ? `${watching} currently watching` : note}
        action={
          <>
            <HudIconButton label="Refresh anime list" onClick={onRefresh} disabled={busy}>
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            </HudIconButton>
            <a
              href={`https://myanimelist.net/profile/${site.myanimelist.username}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Open MyAnimeList profile"
              title="Open MyAnimeList profile"
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </>
        }
      />

      <div className="hud-scroll-x relative z-[2] flex min-h-0 flex-1 items-center gap-2 overflow-x-auto px-3 py-2.5">
        {status === 'loading' && !list.length ? <AnimeSkeleton /> : null}

        {list.map((entry, index) => (
          <a
            key={entry.id}
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            style={{ animationDelay: `${Math.min(index, 7) * 55}ms` }}
            className="card-zoom group w-[78px] shrink-0 transition-transform duration-300 hover:scale-[1.04] xl:w-[88px]"
            title={`${entry.title} — ${entry.watched}${entry.total ? `/${entry.total}` : ''} episodes`}
          >
            <Cover entry={entry} />
            <p className="mt-1.5 line-clamp-2 font-mono text-[9px] font-medium leading-tight text-zinc-300 transition group-hover:text-white">
              {entry.title}
            </p>
          </a>
        ))}

        {!list.length && status !== 'loading' ? (
          <div className="flex h-full w-full items-center justify-center gap-2 text-center text-[10px] leading-relaxed text-zinc-500">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>{error ?? 'Nothing is marked as watching right now.'}</span>
          </div>
        ) : null}
      </div>

      <div className="relative z-[2] flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-600">
        <span>mal · {site.myanimelist.username}</span>
        <span className="normal-case tracking-normal text-zinc-500">{note}</span>
      </div>
    </HudPanel>
  )
}
