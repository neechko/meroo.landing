/**
 * Shared chrome for every panel in the HUD: frosted glass, thin inner frame,
 * animated corner brackets and a soft scanline layer. Keeping it in one place
 * means the whole screen stays visually consistent.
 */
export default function HudPanel({ children, className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag className={`hud-panel ${className}`} {...props}>
      <span className="hud-sheen" aria-hidden="true" />
      <span className="hud-bracket tl" aria-hidden="true" />
      <span className="hud-bracket tr" aria-hidden="true" />
      <span className="hud-bracket bl" aria-hidden="true" />
      <span className="hud-bracket br" aria-hidden="true" />
      {children}
    </Tag>
  )
}

export function PanelHead({ icon: Icon, title, meta, action, className = '' }) {
  return (
    <div
      className={`relative z-[2] flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300 shadow-[0_0_16px_-6px_rgba(167,139,250,0.8)]">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/90">
            {title}
          </p>
          {meta ? (
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-zinc-500">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
    </div>
  )
}

export function HudIconButton({ label, children, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition duration-300 hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200 active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
