import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps keyboard focus inside a dialog while it is open and returns focus to
 * the control that opened it on close. Visibility is measured with client
 * rects so the hidden honeypot field and `display: none` controls are skipped.
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return undefined
    const root = ref.current
    if (!root) return undefined

    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const items = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.getClientRects().length > 0,
      )

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const list = items()
      if (!list.length) {
        event.preventDefault()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const current = document.activeElement
      if (event.shiftKey) {
        if (current === first || !root.contains(current)) {
          event.preventDefault()
          last.focus()
        }
        return
      }
      if (current === last || !root.contains(current)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    // Move focus inside on open; dialogs that autofocus a field are left alone.
    if (!root.contains(document.activeElement)) {
      const target =
        root.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? root
      target.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      // The HUD shell is `inert` until this dialog unmounts, so restoring focus
      // waits one task for the attribute to clear.
      window.setTimeout(() => {
        if (previous && document.contains(previous)) previous.focus()
      }, 0)
    }
  }, [active])

  return ref
}
