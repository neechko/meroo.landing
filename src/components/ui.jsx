import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'

export function Reveal({ children, delay = 0, y = 26, className = '' }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-violet-300/90">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_2px_rgba(167,139,250,.8)]" />
        {eyebrow}
      </span>
      <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[2.6rem] md:leading-[1.1]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 sm:text-base">{description}</p>
      ) : null}
    </div>
  )
}

export function SpotlightCard({ children, className = '', tilt = true, glow = 'rgba(139, 92, 246, 0.16)' }) {
  const ref = useRef(null)
  const [transform, setTransform] = useState('')

  const handleMove = (event) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
    if (tilt) {
      setTransform(
        `perspective(1000px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 5}deg)`,
      )
    }
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setTransform('')}
      style={{ transform }}
      className={`group relative rounded-3xl transition-transform duration-300 ease-out ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), ${glow}, transparent 72%)`,
        }}
      />
      {children}
    </div>
  )
}

export function GlowButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
  icon: Icon,
  ...props
}) {
  const base =
    'group relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'shine bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_16px_50px_-16px_rgba(168,85,247,0.9)] hover:shadow-[0_20px_60px_-14px_rgba(217,70,239,0.85)] hover:-translate-y-0.5'
      : 'glass text-zinc-100 hover:border-white/20 hover:bg-white/[0.07] hover:-translate-y-0.5'

  const content = (
    <>
      {Icon ? <Icon className="relative z-[2] h-[18px] w-[18px] transition-transform duration-300 group-hover:-rotate-6" /> : null}
      <span className="relative z-[2]">{children}</span>
    </>
  )

  if (href) {
    return (
      <a href={href} className={`${base} ${styles} ${className}`} {...props}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${styles} ${className}`} {...props}>
      {content}
    </button>
  )
}

export function Chip({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300 transition-colors duration-200 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-200 ${className}`}
    >
      {children}
    </span>
  )
}

export function StatusDot({ status, pulse = true, className = '' }) {
  const colors = {
    online: 'bg-emerald-400',
    idle: 'bg-amber-400',
    dnd: 'bg-rose-500',
    offline: 'bg-zinc-500',
  }
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      {pulse && status !== 'offline' ? (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${colors[status] ?? colors.offline}`}
        />
      ) : null}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status] ?? colors.offline}`} />
    </span>
  )
}

export function Equalizer({ className = '' }) {
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

export function LiveBadge({ isLive, isDemo = false, className = '' }) {
  const tone = isLive
    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25'
    : isDemo
      ? 'bg-amber-400/10 text-amber-300 ring-amber-400/25'
      : 'bg-zinc-500/10 text-zinc-300 ring-zinc-400/25'
  const dot = isLive ? 'bg-emerald-400' : isDemo ? 'bg-amber-300' : 'bg-zinc-400'
  const label = isLive ? 'Live' : isDemo ? 'Preview' : 'Offline'

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${tone} ${className}`}
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
