import { useEffect, useRef } from 'react'

/**
 * Gives a panel a soft "gyro mirror" feel: the panel tilts a few degrees
 * toward the pointer and a sheen highlight follows it across the glass.
 *
 * It is deliberately cheap: one rAF-throttled transform per panel, the
 * untransformed wrapper is used for hit-testing so the tilt cannot feed back
 * into itself, and everything is skipped in `perf-lite` / reduced motion.
 */
export default function Tilt({
  children,
  className = '',
  maxX = 4.5,
  maxY = 6.5,
  ...props
}) {
  const wrapRef = useRef(null)
  const frameRef = useRef(0)
  const rectRef = useRef(null)
  const stateRef = useRef({ x: 0.5, y: 0.5, active: false })

  useEffect(() => {
    const wrap = wrapRef.current
    const panel = wrap?.firstElementChild
    if (!wrap || !panel) return undefined

    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return undefined

    const reset = () => {
      panel.style.transform = ''
      panel.style.removeProperty('--mx')
      panel.style.removeProperty('--my')
    }

    const apply = () => {
      frameRef.current = 0
      if (document.documentElement.classList.contains('perf-lite')) {
        reset()
        return
      }

      const { x, y, active } = stateRef.current
      if (!active) {
        reset()
        return
      }

      const rx = ((0.5 - y) * maxX).toFixed(2)
      const ry = ((x - 0.5) * maxY).toFixed(2)
      panel.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
      panel.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
      panel.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    }

    const schedule = () => {
      if (frameRef.current) return
      frameRef.current = requestAnimationFrame(apply)
    }

    const measure = () => {
      rectRef.current = wrap.getBoundingClientRect()
    }

    const onEnter = () => {
      measure()
      stateRef.current.active = true
      schedule()
    }

    const onMove = (event) => {
      const rect = rectRef.current
      if (!rect || !rect.width || !rect.height) return
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      stateRef.current.x = Math.min(1, Math.max(0, x))
      stateRef.current.y = Math.min(1, Math.max(0, y))
      schedule()
    }

    const onLeave = () => {
      stateRef.current.active = false
      schedule()
    }

    wrap.addEventListener('pointerenter', onEnter, { passive: true })
    wrap.addEventListener('pointermove', onMove, { passive: true })
    wrap.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      cancelAnimationFrame(frameRef.current)
      wrap.removeEventListener('pointerenter', onEnter)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', measure)
      reset()
    }
  }, [maxX, maxY])

  return (
    <div ref={wrapRef} className={className} {...props}>
      {children}
    </div>
  )
}
