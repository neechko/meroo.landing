import { motion } from 'framer-motion'
import { ArrowUpRight, Check, Loader2, Mail, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { discordProfileUrl, site } from '../config'
import { playSfx } from '../lib/sfx'
import { DiscordIcon } from './icons'

const EMPTY = { name: '', contact: '', message: '', website: '' }

const FIELD =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[12px] text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-violet-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-violet-500/15'

export default function ContactModal({ onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    fetch(site.contact.endpoint, { headers: { Accept: 'application/json' } })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!cancelled && typeof data?.configured === 'boolean') setConfigured(data.configured)
      })
      .catch(() => {
        // A failed preflight is not fatal: the submit button still tries.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (status === 'error') {
      setStatus('idle')
      setError('')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return

    if (form.name.trim().length < 2) {
      setStatus('error')
      setError('Please add a name first.')
      playSfx('error')
      return
    }
    if (form.message.trim().length < 5) {
      setStatus('error')
      setError('Please write a slightly longer message.')
      playSfx('error')
      return
    }

    setStatus('sending')
    setError('')

    try {
      const response = await fetch(site.contact.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || `The server answered HTTP ${response.status}.`)
      setStatus('sent')
      setForm(EMPTY)
      playSfx('chime')
    } catch (cause) {
      setStatus('error')
      setError(cause.message || 'Could not send the message.')
      playSfx('error')
    }
  }

  const discordName = site.displayName

  return (
    <motion.div
      className="fixed inset-0 z-[130] grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close contact form"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#04030a]/80 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="hud-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <p id="contact-title" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/90">
                Open a channel
              </p>
              <p className="text-[10px] text-zinc-500">Messages land in {discordName}&apos;s Discord</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="hud-scroll max-h-[calc(100dvh-8rem)] overflow-y-auto p-4">
          {status === 'sent' ? (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <Check className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-lg font-semibold text-white">Message delivered.</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[11px] leading-relaxed text-zinc-400">
                It just landed in Discord. If I am online, I will probably answer faster than the bots.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-110"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={update('website')}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {configured === false ? (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-amber-200/85">
                  <p className="font-semibold text-amber-200">The form is not connected yet.</p>
                  <p className="mt-0.5">
                    Add <code className="rounded bg-black/25 px-1 py-0.5 font-mono text-[9px]">DISCORD_WEBHOOK_URL</code>{' '}
                    on the server, or send a Discord DM. Submitting will return a clear error until
                    then.
                  </p>
                  <a
                    href={discordProfileUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-semibold text-amber-100 underline decoration-amber-300/40 underline-offset-2"
                  >
                    Open Discord DM
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Your name
                </span>
                <input
                  ref={nameRef}
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  maxLength={60}
                  required
                  placeholder="who is this?"
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Discord / email <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
                </span>
                <input
                  type="text"
                  value={form.contact}
                  onChange={update('contact')}
                  maxLength={120}
                  placeholder="so I can reply"
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Message
                </span>
                <textarea
                  value={form.message}
                  onChange={update('message')}
                  maxLength={1000}
                  required
                  rows={4}
                  placeholder="say something, ask about a bot, or just drop a hello."
                  className={`${FIELD} resize-none`}
                />
                <span className="mt-1 block text-right font-mono text-[9px] text-zinc-600">
                  {form.message.length}/1000
                </span>
              </label>

              {status === 'error' && error ? (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-3 py-2.5 text-[10px] leading-relaxed text-rose-200/90">
                  <p>{error}</p>
                  <a
                    href={discordProfileUrl ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-semibold text-rose-100 underline decoration-rose-300/40 underline-offset-2"
                  >
                    Send a Discord DM instead
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="shine group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_16px_40px_-18px_rgba(168,85,247,0.9)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
              >
                {status === 'sending' ? (
                  <Loader2 className="relative z-[2] h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="relative z-[2] h-3.5 w-3.5" />
                )}
                <span className="relative z-[2]">
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </span>
              </button>

              <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2.5 text-[9px] leading-relaxed text-zinc-600">
                <span>No email needed. Straight to Discord.</span>
                <a
                  href={discordProfileUrl ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-zinc-400 transition hover:text-violet-300"
                >
                  <DiscordIcon className="h-3 w-3" />
                  DM
                </a>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
