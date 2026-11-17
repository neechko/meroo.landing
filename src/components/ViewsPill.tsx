import { Eye } from 'lucide-react'

const formatter = new Intl.NumberFormat('en-US')

export function formatViews(count: number | null | undefined): string {
  if (typeof count !== 'number' || !Number.isFinite(count)) return '--'
  return formatter.format(count)
}

export interface ViewsPillProps {
  count: number | null
  offline?: boolean
  className?: string
  compact?: boolean
}

/** Small live counter used in the header and the profile card. */
export default function ViewsPill({
  count,
  offline = false,
  className = '',
  compact = false,
}: ViewsPillProps) {
  const live = typeof count === 'number' && Number.isFinite(count)

  return (
    <span
      title="Total page views"
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400 ${className}`}
    >
      <Eye className="h-3 w-3 text-violet-300" />
      <span className="tabular-nums text-zinc-200">{formatViews(count)}</span>
      {compact ? null : <span className="text-zinc-400">views</span>}
      {live ? (
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
      ) : (
        <span className="h-1 w-1 rounded-full bg-zinc-400" title={offline ? 'Counter offline' : 'Loading'} />
      )}
    </span>
  )
}
