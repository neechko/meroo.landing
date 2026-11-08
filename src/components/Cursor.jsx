import { useEffect, useRef } from 'react'

const TRAIL_COUNT = 4
const INTERACTIVE =
  'a, button, [role="button"], summary, label, input, textarea, select, [data-cursor="hover"]'

/**
 * Custom cursor: a crisp dot, a lagging ring, a short comet trail and a ripple
 * on click. Only runs for fine pointers without reduced motion.
 *
 * Performance notes:
 *  - the render loop stops completely once the ring/trail settle;
 *  - everything is moved with `transform` (no layout, no width/height);
 *  - blend modes and long trails are dropped in `perf-lite` mode.
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
    const lite = root.classList.contains('perf-lite')
    const dot = dotRef.current
    const ring = ringRef.current
    const rippleHost = rippleHostRef.current
    const trail = trailRefs.current.filter(Boolean).slice(0, lite ? 2 : TRAIL_COUNT)
    if (!dot || !ring || !rippleHost || trail.length === 0) return undefined

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ringPos = { x: target.x, y: target.y }
    const trailPos = trail.map(() => ({ x: target.x, y: target.y }))

    let frame = 0
    let running = false
    let visible = false
    let hovering = false
    let pressed = false

    const paintDot = () => {
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`
    }

    const render = () => {
      running = false
      if (document.hidden) return

      let moving = false

      const dx = target.x - ringPos.x
      const dy = target.y - ringPos.y
      if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) {
        ringPos.x += dx * 0.26
        ringPos.y += dy * 0.26
        moving = true
      } else {
        ringPos.x = target.x
        ringPos.y = target.y
      }

      const ringScale = pressed ? 0.78 : hovering ? 1.6 : 1
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${ringScale})`

      let px = target.x
      let py = target.y
      for (let i = 0; i < trail.length; i += 1) {
        const node = trailPos[i]
        const tdx = px - node.x
        const tdy = py - node.y
        if (Math.abs(tdx) > 0.08 || Math.abs(tdy) > 0.08) moving = true
        node.x += tdx * 0.42
        node.y += tdy * 0.42
        px = node.x
        py = node.y
        trail[i].style.transform = `translate3d(${node.x}px, ${node.y}px, 0) translate(-50%, -50%)`
      }

      if (moving) schedule()
    }

    const schedule = () => {
      if (running || document.hidden) return
      running = true
      frame = requestAnimationFrame(render)
    }

    const setHovering = (value) => {
      if (hovering === value) return
      hovering = value
      ring.classList.toggle('is-hover', value)
      schedule()
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
      if (event.pointerType && event.pointerType !== 'mouse') return
      target.x = event.clientX
      target.y = event.clientY
      paintDot()
      show()
      schedule()
    }

    const onOver = (event) => {
      const node = event.target
      setHovering(node instanceof Element && Boolean(node.closest(INTERACTIVE)))
    }

    const onDown = (event) => {
      pressed = true
      ring.classList.add('is-pressed')
      schedule()
      spawnRipple(event.clientX, event.clientY)
    }

    const onUp = () => {
      pressed = false
      ring.classList.remove('is-pressed')
      schedule()
    }

    const onLeave = (event) => {
      if (event.pointerType === 'mouse' && !event.relatedTarget) hide()
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        running = false
        return
      }
      setHovering(false)
      schedule()
    }

    paintDot()
    schedule()
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
            width: `${5.5 - index * 0.8}px`,
            height: `${5.5 - index * 0.8}px`,
            opacity: 0.3 - index * 0.055,
          }}
        />
      ))}
      <span ref={ringRef} className="cursor-ring" />
      <span ref={dotRef} className="cursor-dot" />
    </div>
  )
}
