import type { DiscordStatus } from '../types'

export interface StatusDotProps {
  status: DiscordStatus
  pulse?: boolean
  className?: string
}

export function StatusDot({ status, pulse = true, className }: StatusDotProps) {
  const colors: Record<DiscordStatus, string> = {
    online: 'bg-emerald-400',
    idle: 'bg-amber-400',
    dnd: 'bg-rose-500',
    offline: 'bg-zinc-500',
  }
  // The caller's size must win over the default: both utilities have the same
  // specificity, so appending them would leave the base size in charge.
  const size = className || 'h-2.5 w-2.5'
  return (
    <span className={`relative flex ${size}`}>
      {pulse && status !== 'offline' ? (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${colors[status] ?? colors.offline}`}
        />
      ) : null}
      <span className={`relative inline-flex h-full w-full rounded-full ${colors[status] ?? colors.offline}`} />
    </span>
  )
}

export function Equalizer({ className = '' }: { className?: string }) {
  return (
    <span className={`equalizer text-current ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

export interface LiveBadgeProps {
  isLive: boolean
  isDemo?: boolean
  className?: string
}

export function LiveBadge({ isLive, isDemo = false, className = '' }: LiveBadgeProps) {
  const tone = isLive
    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25'
    : isDemo
      ? 'bg-amber-400/10 text-amber-300 ring-amber-400/25'
      : 'bg-zinc-500/10 text-zinc-300 ring-zinc-400/25'
  const dot = isLive ? 'bg-emerald-400' : isDemo ? 'bg-amber-300' : 'bg-zinc-400'
  const label = isLive ? 'Live' : isDemo ? 'Preview' : 'Offline'

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${tone} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {isLive || isDemo ? (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'animate-ping' : 'animate-pulse'} ${dot}`} />
        ) : null}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  )
}
