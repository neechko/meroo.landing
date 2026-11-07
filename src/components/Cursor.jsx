import { useEffect, useRef } from 'react'

const TRAIL_COUNT = 6
const INTERACTIVE = 'a, button, [role="button"], summary, label, input, textarea, select, [data-cursor="hover"]'

/**
 * Custom cursor: a crisp dot, a lagging ring in blend mode, a short comet trail
 * and a ripple on click. Only runs for fine pointers without reduced motion.
 */
export default function Cursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const rippleHostRef = useRef(null)
  const trailRefs = useRef([])

  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return undefined

    const root = document.documentElement
    const dot = dotRef.current
    const ring = ringRef.current
    const rippleHost = rippleHostRef.current
    const trail = trailRefs.current.filter(Boolean)
    if (!dot || !ring || !rippleHost || trail.length === 0) return undefined

    const viewport = { w: window.innerWidth, h: window.innerHeight }
    const target = { x: viewport.w / 2, y: viewport.h / 2 }
    const ringPos = { x: target.x, y: target.y }
    const trailPos = trail.map(() => ({ x: target.x, y: target.y }))

    let frame = 0
    let visible = false
    let hovering = false
    let pressed = false

    const paint = () => {
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`

      ringPos.x += (target.x - ringPos.x) * 0.16
      ringPos.y += (target.y - ringPos.y) * 0.16
      const ringScale = pressed ? 0.78 : hovering ? 1.06 : 1
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${ringScale})`

      let px = target.x
      let py = target.y
      for (let i = 0; i < trailPos.length; i += 1) {
        const node = trailPos[i]
        node.x += (px - node.x) * 0.34
        node.y += (py - node.y) * 0.34
        px = node.x
        py = node.y
        trail[i].style.transform = `translate3d(${node.x}px, ${node.y}px, 0) translate(-50%, -50%)`
      }

      frame = requestAnimationFrame(paint)
    }

    const setHovering = (value) => {
      if (hovering === value) return
      hovering = value
      ring.classList.toggle('is-hover', value)
    }

    const show = () => {
      if (visible) return
      visible = true
      root.classList.add('cursor-ready', 'cursor-visible')
    }

    const hide = () => {
      if (!visible) return
      visible = false
      root.classList.remove('cursor-visible')
    }

    const spawnRipple = (x, y) => {
      const ripple = document.createElement('span')
      ripple.className = 'cursor-ripple'
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
      rippleHost.appendChild(ripple)
    }

    const onMove = (event) => {
      target.x = event.clientX
      target.y = event.clientY
      show()
    }

    const onOver = (event) => {
      const node = event.target
      setHovering(node instanceof Element && Boolean(node.closest(INTERACTIVE)))
    }

    const onDown = (event) => {
      pressed = true
      ring.classList.add('is-pressed')
      spawnRipple(event.clientX, event.clientY)
    }

    const onUp = () => {
      pressed = false
      ring.classList.remove('is-pressed')
    }

    const onLeave = (event) => {
      if (event.pointerType === 'mouse' && !event.relatedTarget) hide()
    }

    const onVisibility = () => {
      if (!document.hidden) setHovering(false)
    }

    frame = requestAnimationFrame(paint)
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerout', onLeave, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(frame)
      root.classList.remove('cursor-ready', 'cursor-visible')
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerout', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      rippleHost.replaceChildren()
    }
  }, [])

  return (
    <div className="cursor-shell" aria-hidden="true">
      <div ref={rippleHostRef} className="cursor-ripples" />
      {Array.from({ length: TRAIL_COUNT }, (_, index) => (
        <span
          key={index}
          ref={(node) => {
            trailRefs.current[index] = node
          }}
          className="cursor-trail"
          style={{
            width: `${6 - index * 0.7}px`,
            height: `${6 - index * 0.7}px`,
            opacity: 0.3 - index * 0.042,
          }}
        />
      ))}
      <span ref={ringRef} className="cursor-ring" />
      <span ref={dotRef} className="cursor-dot" />
    </div>
  )
}
