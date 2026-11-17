import { useEffect, useMemo, useState } from 'react'

/** Re-render every `interval` ms. Used by timers and progress bars. */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export interface RotatingTextOptions {
  typeSpeed?: number
  deleteSpeed?: number
  hold?: number
}

/** Typewriter effect that cycles through a list of words. */
export function useRotatingText(
  words: string[] | undefined,
  { typeSpeed = 65, deleteSpeed = 32, hold = 1700 }: RotatingTextOptions = {},
): string {
  const list = useMemo(() => (words?.length ? words : ['']), [words])
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const reduced = useMemo(() => prefersReducedMotion(), [])

  useEffect(() => {
    if (reduced) {
      setText(list[0])
      return
    }
    const word = list[index % list.length]

    if (!deleting && text === word) {
      const timeout = setTimeout(() => setDeleting(true), hold)
      return () => clearTimeout(timeout)
    }

    if (deleting && text === '') {
      setDeleting(false)
      setIndex((value) => (value + 1) % list.length)
      return
    }

    const timeout = setTimeout(
      () => {
        setText(deleting ? word.slice(0, Math.max(0, text.length - 1)) : word.slice(0, text.length + 1))
      },
      deleting ? deleteSpeed : typeSpeed,
    )
    return () => clearTimeout(timeout)
  }, [text, deleting, index, list, typeSpeed, deleteSpeed, hold, reduced])

  return text
}

/** Highlight the nav link for the section currently in view. */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)

    if (!sections.length || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.2, 0.5, 1] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [ids])

  return active
}
