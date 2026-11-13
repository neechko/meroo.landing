/**
 * Small WebAudio sound engine for the HUD.
 *
 * No audio files: every click is synthesised on the fly from a couple of
 * oscillators plus a short noise transient, which keeps the bundle tiny and
 * lets each interaction have its own small variation. The palette is meant to
 * match the Castorice / computational look: soft glassy taps, cool chimes and
 * airy whooshes rather than loud UI beeps.
 *
 * The context is created lazily on the first real gesture, so browsers do not
 * block it. A single delegated listener covers every button and link, and
 * `data-sfx` can override the voice for a specific element.
 */

const STORAGE_KEY = 'meroo.sfx'
const THROTTLE_MS = 45

let ctx = null
let master = null
let enabled = true
let lastPlayed = 0

function readEnabled() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

function ensure() {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx

  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null

  try {
    ctx = new Ctor()
  } catch {
    return null
  }

  master = ctx.createGain()
  master.gain.value = 0.95

  // The voices deliberately stack a couple of short tones, so a limiter keeps
  // the sum from clipping on laptop speakers while still sounding present.
  try {
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 6
    limiter.ratio.value = 6
    limiter.attack.value = 0.003
    limiter.release.value = 0.16
    master.connect(limiter)
    limiter.connect(ctx.destination)
  } catch {
    // Very old engines: play without the safety net rather than going silent.
    master.connect(ctx.destination)
  }
  return ctx
}

/** Tiny random detune so repeated taps never sound machine-identical. */
function drift(amount = 18) {
  return (Math.random() * 2 - 1) * amount
}

function tone({
  freq,
  at = 0,
  dur = 0.16,
  gain = 0.05,
  type = 'sine',
  glide = 1,
  lowpass = 0,
  pan = 0,
}) {
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(Math.max(30, freq), start)
  if (glide !== 1) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, freq * glide),
      start + Math.max(0.02, dur),
    )
  }

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.006)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur)

  let node = osc
  if (lowpass) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(lowpass, start)
    filter.Q.value = 0.6
    node.connect(filter)
    node = filter
  }
  if (pan && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    node.connect(panner)
    node = panner
  }

  node.connect(amp)
  amp.connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.03)
}

/** Short filtered noise burst — the "contact" part of a click. */
function tick({ at = 0, dur = 0.04, gain = 0.02, freq = 2200, q = 1.2, pan = 0 }) {
  const start = ctx.currentTime + at
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur)

  source.connect(filter)
  filter.connect(amp)
  if (pan && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    amp.connect(panner)
    panner.connect(master)
  } else {
    amp.connect(master)
  }

  source.start(start)
  source.stop(start + dur + 0.01)
}

const VOICES = {
  tap() {
    const d = drift(22)
    tick({ dur: 0.03, gain: 0.09, freq: 2400 + d * 12 })
    tone({ freq: 620 + d, dur: 0.11, gain: 0.22, type: 'triangle', lowpass: 2800 })
    tone({ freq: 940 + d * 1.4, dur: 0.08, gain: 0.1, type: 'sine', pan: 0.08 })
  },

  tab() {
    tick({ dur: 0.026, gain: 0.07, freq: 2800 })
    tone({ freq: 500 + drift(12), dur: 0.1, gain: 0.17, type: 'triangle', glide: 1.16, lowpass: 2400 })
  },

  toggle() {
    tone({ freq: 700 + drift(10), dur: 0.11, gain: 0.2, type: 'sine', glide: 1.3 })
    tone({ freq: 1050, at: 0.045, dur: 0.13, gain: 0.12, type: 'sine', pan: -0.1 })
  },

  link() {
    tone({ freq: 860 + drift(14), dur: 0.14, gain: 0.15, type: 'sine' })
    tone({ freq: 1290, at: 0.032, dur: 0.13, gain: 0.08, type: 'sine', pan: 0.12 })
  },

  open() {
    tick({ at: 0.01, dur: 0.2, gain: 0.06, freq: 3400, q: 0.6 })
    tone({ freq: 410, dur: 0.3, gain: 0.2, type: 'sine', glide: 1.52 })
    tone({ freq: 615, at: 0.05, dur: 0.28, gain: 0.12, type: 'triangle', glide: 1.35, lowpass: 3000 })
  },

  close() {
    tone({ freq: 560, dur: 0.23, gain: 0.18, type: 'sine', glide: 0.7 })
    tone({ freq: 840, at: 0.02, dur: 0.17, gain: 0.08, type: 'triangle', glide: 0.78, lowpass: 2400 })
  },

  confirm() {
    // A small rising triad: reads as "accepted" without being a fanfare.
    tone({ freq: 523.25, dur: 0.13, gain: 0.16, type: 'triangle', lowpass: 3200 })
    tone({ freq: 659.25, at: 0.06, dur: 0.15, gain: 0.15, type: 'triangle', lowpass: 3200 })
    tone({ freq: 783.99, at: 0.12, dur: 0.26, gain: 0.13, type: 'sine', lowpass: 3600, pan: 0.06 })
  },

  chime() {
    tone({ freq: 1046.5, dur: 0.38, gain: 0.13, type: 'sine' })
    tone({ freq: 1568, at: 0.016, dur: 0.32, gain: 0.075, type: 'sine', pan: 0.14 })
    tone({ freq: 2093, at: 0.04, dur: 0.24, gain: 0.04, type: 'sine', pan: -0.14 })
  },

  error() {
    tone({ freq: 220, dur: 0.21, gain: 0.18, type: 'sawtooth', glide: 0.68, lowpass: 700 })
    tone({ freq: 164, at: 0.07, dur: 0.23, gain: 0.14, type: 'triangle', lowpass: 520 })
  },
}

export function playSfx(name = 'tap') {
  if (!enabled) return
  if (typeof window === 'undefined') return
  if (typeof performance !== 'undefined' && performance.now() - lastPlayed < THROTTLE_MS) return

  const voice = VOICES[name] ?? VOICES.tap
  const context = ensure()
  if (!context) return

  lastPlayed = typeof performance !== 'undefined' ? performance.now() : Date.now()

  const fire = () => {
    try {
      voice()
    } catch {
      // A missing AudioContext feature should never break the interaction.
    }
  }

  // Scheduling a short envelope while the context is still suspended can make
  // the whole sound land in the past by the time audio starts. Wait for the
  // resume so the very first click is audible too.
  if (context.state === 'running') {
    fire()
  } else {
    context.resume().then(fire).catch(() => {})
  }
}

export function setSfxEnabled(value) {
  enabled = Boolean(value)
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, '0')
  } catch {
    // Private mode: the preference just will not persist.
  }
}

export function isSfxEnabled() {
  return enabled
}

const INTERACTIVE = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  'summary',
  'input[type="submit"]',
  'input[type="button"]',
  '[data-sfx]',
].join(', ')

function resolveSound(element) {
  const explicit = element.getAttribute?.('data-sfx')
  if (explicit) return explicit

  const label = `${element.getAttribute?.('aria-label') ?? ''} ${
    element.getAttribute?.('title') ?? ''
  } ${element.textContent ?? ''}`.toLowerCase()

  if (element.matches('[role="tab"]') || element.closest('[role="tablist"]')) return 'tab'
  if (/pause|play|volume|mute|sound|music/.test(label)) return 'toggle'
  if (/close|cancel|dismiss|back|skip/.test(label)) return 'close'
  if (/next|continue|start|enter|open|send|submit|talk|contact|castorice/.test(label)) return 'confirm'
  if (element.matches('a[href]')) return 'link'
  return 'tap'
}

/**
 * Delegated listeners for the whole page. Mounted once from `main.jsx`.
 * Returns a cleanup function (useful for hot reload / tests).
 */
export function installSfx() {
  if (typeof document === 'undefined') return () => {}
  enabled = readEnabled()

  // Any first gesture unlocks the context, even when the user clicks empty
  // space. That way the very next button press is already running.
  const unlock = () => {
    const context = ensure()
    if (context && context.state !== 'running') context.resume().catch(() => {})
  }

  const onPointerDown = (event) => {
    unlock()
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null
    if (!target) return
    playSfx(resolveSound(target))
  }

  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    unlock()
    const active = document.activeElement
    if (!(active instanceof Element) || !active.matches(INTERACTIVE)) return
    playSfx(resolveSound(active))
  }

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
  document.addEventListener('keydown', onKeyDown, true)

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
  }
}
