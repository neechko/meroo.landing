import { useEffect, useRef } from 'react'

/**
 * Gives a panel a soft "gyro mirror" feel: the panel tilts a few degrees
 * toward the pointer and a sheen highlight follows it across the glass.
 *
 * The motion is spring-ish rather than 1:1. A single rAF loop eases both the
 * pointer position and the tilt strength, so hovering ramps in over a few
 * frames and moving to another panel lets the old one drift back to rest
 * instead of snapping. The untransformed wrapper is used for hit-testing so
 * the tilt cannot feed back into itself.
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
  const stateRef = useRef({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    strength: 0,
    targetStrength: 0,
  })

  useEffect(() => {
    const wrap = wrapRef.current
    const panel = wrap?.firstElementChild
    if (!wrap || !panel) return undefined

    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return undefined

    const state = stateRef.current
    let last = 0

    const reset = () => {
      panel.style.transform = ''
      panel.style.removeProperty('--mx')
      panel.style.removeProperty('--my')
    }

    const apply = (now) => {
      frameRef.current = 0
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now

      // Exponential smoothing keeps the feel identical at 60 and 144 Hz.
      const follow = 1 - Math.exp(-dt * 8)
      const ease = 1 - Math.exp(-dt * 6)

      state.x += (state.targetX - state.x) * follow
      state.y += (state.targetY - state.y) * follow
      state.strength += (state.targetStrength - state.strength) * ease

      const settled =
        state.targetStrength === 0 &&
        state.strength < 0.002 &&
        Math.abs(state.x - 0.5) < 0.002 &&
        Math.abs(state.y - 0.5) < 0.002

      if (settled) {
        state.x = 0.5
        state.y = 0.5
        state.strength = 0
        reset()
        return
      }

      // Tilt is scaled by the strength envelope so entering the panel fades
      // the rotation in instead of jumping to the pointer position.
      const rx = ((0.5 - state.y) * maxX * state.strength).toFixed(2)
      const ry = ((state.x - 0.5) * maxY * state.strength).toFixed(2)
      panel.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
      panel.style.setProperty('--mx', `${(state.x * 100).toFixed(1)}%`)
      panel.style.setProperty('--my', `${(state.y * 100).toFixed(1)}%`)

      frameRef.current = requestAnimationFrame(apply)
    }

    const schedule = () => {
      if (frameRef.current) return
      frameRef.current = requestAnimationFrame(apply)
    }

    const measure = () => {
      rectRef.current = wrap.getBoundingClientRect()
    }

    const track = (event) => {
      const rect = rectRef.current
      if (!rect || !rect.width || !rect.height) return
      state.targetX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      state.targetY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    }

    const onEnter = (event) => {
      measure()
      track(event)
      state.targetStrength = 1
      schedule()
    }

    const onMove = (event) => {
      if (!rectRef.current) measure()
      track(event)
      schedule()
    }

    const onLeave = () => {
      // Drift back to neutral from wherever the panel currently is.
      state.targetStrength = 0
      state.targetX = 0.5
      state.targetY = 0.5
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
