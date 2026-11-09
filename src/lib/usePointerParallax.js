import { useEffect, useRef } from 'react'

/**
 * Mouse "mirror" parallax with easing.
 *
 * The pointer only sets a target; a single rAF loop lerps the current position
 * toward it, so the wallpaper glides instead of stepping on every mouse event.
 * It exposes --px / --py so a sheen can follow the cursor. Disabled for reduced
 * motion and touch-only devices. Transform-only, so it is safe in perf-lite.
 */
export function usePointerParallax({ x = 14, y = 10, scale = 1.045, sheen = true } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return undefined

    let frame = 0
    let running = false
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }

    const render = () => {
      node.style.transform = `translate3d(${(-current.x * x).toFixed(2)}px, ${(-current.y * y).toFixed(2)}px, 0) scale(${scale})`
      // A full-screen gradient repaint every frame is the expensive part on old
      // GPUs, so callers can opt out and keep only the composited transform.
      if (sheen) {
        node.style.setProperty('--px', `${(((current.x + 1) / 2) * 100).toFixed(1)}%`)
        node.style.setProperty('--py', `${(((current.y + 1) / 2) * 100).toFixed(1)}%`)
      }
    }

    const tick = () => {
      const dx = target.x - current.x
      const dy = target.y - current.y
      current.x += dx * 0.12
      current.y += dy * 0.12
      render()

      if (Math.abs(dx) > 0.0006 || Math.abs(dy) > 0.0006) {
        frame = requestAnimationFrame(tick)
      } else {
        current.x = target.x
        current.y = target.y
        render()
        running = false
      }
    }

    const start = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(tick)
    }

    const onMove = (event) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * 2
      target.y = (event.clientY / window.innerHeight - 0.5) * 2
      start()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      node.style.transform = ''
      node.style.removeProperty('--px')
      node.style.removeProperty('--py')
    }
  }, [x, y, scale, sheen])

  return ref
}
