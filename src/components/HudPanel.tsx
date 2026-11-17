import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ComponentType,
  ElementType,
  ReactNode,
} from 'react'

/**
 * Shared chrome for every panel in the HUD: an opaque violet surface, a thin
 * inner frame and corner brackets. Keeping it in one place means the whole
 * screen stays visually consistent.
 */
export type HudPanelProps = ComponentPropsWithoutRef<'section'> & { as?: ElementType }

export default function HudPanel({ children, className = '', as, ...props }: HudPanelProps) {
  const Tag: ElementType = as ?? 'section'
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

export interface PanelHeadProps {
  icon?: ComponentType<{ className?: string }>
  title: ReactNode
  meta?: ReactNode
  action?: ReactNode
  className?: string
}

export function PanelHead({ icon: Icon, title, meta, action, className = '' }: PanelHeadProps) {
  return (
    <div
      className={`relative z-[2] flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/90">
            {title}
          </h2>
          {meta ? (
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-zinc-400">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-4">{action}</div> : null}
    </div>
  )
}

export type HudIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string }

export function HudIconButton({ label, children, className = '', ...props }: HudIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`tap-44 grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition duration-300 hover:-translate-y-px hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-violet-200 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
