import { useEffect, useRef } from 'react'

function Particles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const mouse = { x: -9999, y: -9999 }
    let width = 0
    let height = 0
    let particles = []
    let raf = 0

    const build = () => {
      const count = Math.min(80, Math.max(28, Math.floor((width * height) / 30000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 0.5,
        a: Math.random() * 0.45 + 0.15,
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
      if (reduced) draw(true)
    }

    const draw = (once = false) => {
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

      // faint lines between nearby particles
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i]
          const b = particles[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 110) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 * (1 - d / 110)})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // particles reach toward the pointer like a small constellation
      if (mouse.x > -1000) {
        for (const p of particles) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y)
          if (d < 170) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(216, 180, 254, ${0.22 * (1 - d / 170)})`
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

    resize()
    draw(reduced)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-50" aria-hidden="true" />
}

export default function Background() {
  const glowRef = useRef(null)

  useEffect(() => {
    let frame = 0
    const onMove = (event) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!glowRef.current) return
        glowRef.current.style.setProperty('--x', `${event.clientX}px`)
        glowRef.current.style.setProperty('--y', `${event.clientY}px`)
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(76,29,149,0.35),transparent_70%)]" />

      <div className="aurora-blob -left-32 -top-40 h-[34rem] w-[34rem] bg-violet-600/45" />
      <div
        className="aurora-blob right-[-10%] top-[22%] h-[30rem] w-[30rem] bg-fuchsia-600/25"
        style={{ animationDelay: '-8s', animationDuration: '28s' }}
      />
      <div
        className="aurora-blob bottom-[-12%] left-[28%] h-[32rem] w-[32rem] bg-blue-600/25"
        style={{ animationDelay: '-15s', animationDuration: '32s' }}
      />

      <div className="absolute inset-0 grid-lines" />
      <Particles />

      <div
        ref={glowRef}
        className="absolute inset-0 hidden md:block"
        style={{ '--x': '-1000px', '--y': '-1000px' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(720px circle at var(--x, -1000px) var(--y, -1000px), rgba(139,92,246,0.12), transparent 68%)',
          }}
        />
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background:
              'radial-gradient(190px circle at var(--x, -1000px) var(--y, -1000px), rgba(233,213,255,0.13), transparent 72%)',
          }}
        />
      </div>

      <div className="noise absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#06040f] to-transparent" />
    </div>
  )
}
