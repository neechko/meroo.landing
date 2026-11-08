import { Eye } from 'lucide-react'

const formatter = new Intl.NumberFormat('en-US')

export function formatViews(count) {
  if (!Number.isFinite(count)) return '—'
  return formatter.format(count)
}

/** Small live counter used in the header and the profile card. */
export default function ViewsPill({ count, offline, className = '', compact = false }) {
  const live = Number.isFinite(count)

  return (
    <span
      title="Total page views"
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500 ${className}`}
    >
      <Eye className="h-3 w-3 text-violet-300" />
      <span className="tabular-nums text-zinc-200">{formatViews(count)}</span>
      {compact ? null : <span className="text-zinc-600">views</span>}
      {live ? (
        <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
      ) : (
        <span className="h-1 w-1 rounded-full bg-zinc-600" title={offline ? 'Counter offline' : 'Loading'} />
      )}
    </span>
  )
}
