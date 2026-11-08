import { useEffect, useRef } from 'react'

function lowPowerHint() {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency ?? 8
  const memory = navigator.deviceMemory ?? 8
  return cores <= 4 || memory <= 4
}

function Particles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const root = document.documentElement
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const lite = lowPowerHint()
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.75)
    const mouse = { x: -9999, y: -9999 }
    let width = 0
    let height = 0
    let particles = []
    let raf = 0
    let lastDraw = 0

    const build = () => {
      const count = lite
        ? 30
        : Math.min(60, Math.max(24, Math.floor((width * height) / 42000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.42 + 0.14,
      }))
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
      if (reduced) draw(performance.now(), true)
    }

    const draw = (time, once = false) => {
      if (document.hidden && !once) {
        raf = 0
        return
      }

      const liteNow = lite || root.classList.contains('perf-lite')
      if (!once && liteNow && time - lastDraw < 32) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastDraw = time

      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        if (!once) {
          p.x += p.vx
          p.y += p.vy

          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < 130 && dist > 0.01) {
            const force = (130 - dist) / 130
            p.x += (dx / dist) * force * 0.7
            p.y += (dy / dist) * force * 0.7
          }

          if (p.x < -20) p.x = width + 20
          if (p.x > width + 20) p.x = -20
          if (p.y < -20) p.y = height + 20
          if (p.y > height + 20) p.y = -20
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(196, 181, 253, ${p.a})`
        ctx.fill()
      }

      // Faint lines between nearby particles. Skipped in performance mode.
      if (!liteNow) {
        const maxD = 104
        const maxD2 = maxD * maxD
        for (let i = 0; i < particles.length; i += 1) {
          for (let j = i + 1; j < particles.length; j += 1) {
            const a = particles[i]
            const b = particles[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const d2 = dx * dx + dy * dy
            if (d2 < maxD2) {
              const d = Math.sqrt(d2)
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 * (1 - d / maxD)})`
              ctx.lineWidth = 0.6
              ctx.stroke()
            }
          }
        }
      }

      // Particles reach toward the pointer like a small constellation.
      if (mouse.x > -1000) {
        const reach = liteNow ? 120 : 170
        for (const p of particles) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y)
          if (d < reach) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(216, 180, 254, ${0.22 * (1 - d / reach)})`
            ctx.lineWidth = 0.55
            ctx.stroke()
          }
        }
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(237, 233, 254, 0.75)'
        ctx.fill()
      }

      if (!once) raf = requestAnimationFrame(draw)
    }

    const onPointer = (event) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
        return
      }
      if (!reduced && !raf) raf = requestAnimationFrame(draw)
    }

    resize()
    if (!reduced) raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full opacity-45"
      aria-hidden="true"
    />
  )
}

export default function Background() {
  const glowRef = useRef(null)

  // Enable the lighter CSS profile on weak hardware, or if the measured
  // frame rate stays below 42fps. Sampling keeps running for a few windows so
  // a slow HUD is still caught if the visitor waits before entering.
  useEffect(() => {
    const root = document.documentElement
    if (lowPowerHint()) root.classList.add('perf-lite')

    let raf = 0
    let frames = 0
    let started = 0
    let windows = 0

    const sample = (now) => {
      if (root.classList.contains('perf-lite')) return
      if (!started) started = now
      frames += 1
      if (now - started >= 2000) {
        const fps = (frames * 1000) / (now - started)
        if (fps < 42) {
          root.classList.add('perf-lite')
          return
        }
        windows += 1
        frames = 0
        started = now
        if (windows >= 6) return
      }
      raf = requestAnimationFrame(sample)
    }

    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(sample)
    }, 1400)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let nextX = -9999
    let nextY = -9999

    const onMove = (event) => {
      nextX = event.clientX
      nextY = event.clientY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!glowRef.current) return
        glowRef.current.style.transform = `translate3d(${nextX - 380}px, ${nextY - 380}px, 0)`
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(76,29,149,0.38),transparent_70%)]" />

      <div className="aurora-blob -left-32 -top-40 h-[34rem] w-[34rem] bg-violet-600/45" />
      <div
        className="aurora-blob right-[-10%] top-[22%] h-[30rem] w-[30rem] bg-fuchsia-600/25"
        style={{ animationDelay: '-8s', animationDuration: '28s' }}
      />
      <div
        className="aurora-blob aurora-3 bottom-[-12%] left-[28%] h-[32rem] w-[32rem] bg-cyan-500/20"
        style={{ animationDelay: '-15s', animationDuration: '32s' }}
      />

      <div className="absolute inset-0 grid-lines" />
      <Particles />

      <div
        ref={glowRef}
        className="pointer-glow"
        style={{ transform: 'translate3d(-9999px, -9999px, 0)' }}
      />

      <div className="noise absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05030c] to-transparent" />
    </div>
  )
}
