/**
 * Small WebAudio sound engine for the HUD.
 *
 * No audio files: every click is synthesised from a few oscillators, a short
 * filtered-noise transient and a shared "air" delay, which keeps the bundle
 * tiny and lets each interaction have its own small variation.
 *
 * The palette follows the Castorice / computational look rather than generic
 * UI beeps: water-drop taps, muted glass bells, airy portal sweeps and soft
 * low notes. Every voice is tuned to the same A-minor pentatonic family, so
 * buttons pressed in sequence still sound like one instrument, and a short
 * damped delay tail makes them sit in the same space as the ambient track.
 */

const STORAGE_KEY = 'meroo.sfx'
const THROTTLE_MS = 45

/** One scale for the whole UI: A minor pentatonic, low to high. */
const NOTE = {
  A3: 220,
  Bb3: 233.08,
  B3: 246.94,
  E4: 329.63,
  A4: 440,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  A6: 1760,
}

let ctx = null
let master = null
let space = null
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
  master.gain.value = 1

  // Cut the sub-rumble laptop speakers cannot reproduce anyway, so the short
  // voices spend their headroom on the warm 400–1500 Hz band instead.
  try {
    const rumble = ctx.createBiquadFilter()
    rumble.type = 'highpass'
    rumble.frequency.value = 60
    master.connect(rumble)
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 6
    limiter.ratio.value = 6
    limiter.attack.value = 0.004
    limiter.release.value = 0.2
    rumble.connect(limiter)
    limiter.connect(ctx.destination)
  } catch {
    // Very old engines: play without the safety net rather than going silent.
    master.connect(ctx.destination)
  }

  // Shared "air": a short damped delay that every voice can send into. It is
  // what makes a dry oscillator sound like it was played in a quiet hall
  // instead of inside the speaker.
  try {
    space = ctx.createGain()
    space.gain.value = 1
    const delay = ctx.createDelay(0.5)
    delay.delayTime.value = 0.105
    const damp = ctx.createBiquadFilter()
    damp.type = 'lowpass'
    damp.frequency.value = 2400
    const feedback = ctx.createGain()
    feedback.gain.value = 0.28
    const wet = ctx.createGain()
    wet.gain.value = 0.45
    space.connect(delay)
    delay.connect(damp)
    damp.connect(feedback)
    feedback.connect(delay)
    damp.connect(wet)
    wet.connect(master)
  } catch {
    space = null
  }

  return ctx
}

/** Tiny random detune so repeated taps never sound machine-identical. */
function drift(amount = 18) {
  return (Math.random() * 2 - 1) * amount
}

function route(node, send, pan) {
  let tail = node
  if (pan && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    tail.connect(panner)
    tail = panner
  }
  tail.connect(master)
  if (send > 0 && space) {
    const sendGain = ctx.createGain()
    sendGain.gain.value = send
    tail.connect(sendGain)
    sendGain.connect(space)
  }
}

function tone({
  freq,
  at = 0,
  dur = 0.14,
  gain = 0.1,
  type = 'sine',
  glide = 1,
  lowpass = 0,
  pan = 0,
  send = 0.16,
  attack = 0.007,
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
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack)
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

  node.connect(amp)
  route(amp, send, pan)
  osc.start(start)
  osc.stop(start + dur + 0.03)
}

/** Short filtered noise burst — the "contact" part of a click. */
function tick({ at = 0, dur = 0.03, gain = 0.03, freq = 2400, q = 1, pan = 0, send = 0.1 }) {
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
  route(amp, send, pan)

  source.start(start)
  source.stop(start + dur + 0.01)
}

/** Airy rise-and-fall noise, used by the portal-like open/close voices. */
function swell({
  at = 0,
  dur = 0.32,
  gain = 0.05,
  from = 500,
  to = 2400,
  q = 0.9,
  pan = 0,
  send = 0.3,
}) {
  const start = ctx.currentTime + at
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), start + dur * 0.7)
  filter.Q.value = q

  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + dur * 0.45)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur)

  source.connect(filter)
  filter.connect(amp)
  route(amp, send, pan)

  source.start(start)
  source.stop(start + dur + 0.01)
}

/** Glass bell: a fundamental plus quiet inharmonic partials that die faster. */
function bell({ freq, at = 0, dur = 0.5, gain = 0.07, pan = 0, send = 0.4 }) {
  const partials = [
    [1, 1, 1],
    [2.01, 0.4, 0.6],
    [2.98, 0.18, 0.38],
    [4.2, 0.08, 0.24],
  ]
  for (const [ratio, level, life] of partials) {
    tone({
      freq: freq * ratio,
      at,
      dur: dur * life,
      gain: gain * level,
      type: 'sine',
      pan,
      send,
    })
  }
}

const VOICES = {
  // Water drop: a short upward plink with a warm body underneath.
  tap() {
    const d = drift(10)
    tick({ dur: 0.022, gain: 0.035, freq: 3200, q: 0.8, send: 0.12 })
    tone({ freq: NOTE.E5 + d, dur: 0.085, gain: 0.17, type: 'sine', glide: 1.26, send: 0.24 })
    tone({ freq: NOTE.A4 + d * 0.5, dur: 0.13, gain: 0.075, type: 'triangle', lowpass: 1600, send: 0.12 })
  },

  // Tab: softer, higher and shorter than a tap so switching feels lighter.
  tab() {
    const d = drift(8)
    tick({ dur: 0.02, gain: 0.028, freq: 2600, q: 0.9, send: 0.1 })
    tone({ freq: NOTE.C5 + d, dur: 0.09, gain: 0.115, type: 'triangle', glide: 1.06, lowpass: 2400, send: 0.18 })
    tone({ freq: NOTE.G5 + d, at: 0.018, dur: 0.09, gain: 0.036, type: 'sine', pan: 0.1, send: 0.24 })
  },

  // Toggle: a rising fifth, like a small latch closing.
  toggle() {
    const d = drift(6)
    tick({ dur: 0.018, gain: 0.022, freq: 3400, q: 1.1, send: 0.1 })
    tone({ freq: NOTE.E5 + d, dur: 0.1, gain: 0.12, type: 'triangle', lowpass: 2800, send: 0.18 })
    tone({ freq: NOTE.B5 + d, at: 0.055, dur: 0.18, gain: 0.07, type: 'sine', pan: -0.08, send: 0.3 })
  },

  // Link: a light glass pair, quieter so outbound links do not shout.
  link() {
    const d = drift(6)
    tone({ freq: NOTE.C6 + d, dur: 0.22, gain: 0.06, type: 'sine', send: 0.34 })
    tone({ freq: NOTE.G6 + d, at: 0.02, dur: 0.16, gain: 0.028, type: 'sine', pan: 0.16, send: 0.32 })
    tone({ freq: NOTE.C5 + d * 0.5, dur: 0.16, gain: 0.04, type: 'triangle', lowpass: 2000, send: 0.16 })
  },

  // Open: air rushing outward, then a low pad blooming into a glass fifth.
  open() {
    swell({ dur: 0.34, gain: 0.045, from: 500, to: 2600, send: 0.3 })
    tone({ freq: NOTE.A4, dur: 0.42, gain: 0.075, type: 'triangle', glide: 1.5, lowpass: 1500, send: 0.22 })
    tone({ freq: NOTE.E5, at: 0.07, dur: 0.36, gain: 0.052, type: 'sine', glide: 1.5, send: 0.4 })
    tone({ freq: NOTE.E6, at: 0.16, dur: 0.3, gain: 0.022, type: 'sine', pan: 0.22, send: 0.45 })
  },

  // Close: the same air folding back down into a low, quiet landing.
  close() {
    tone({ freq: NOTE.E5, dur: 0.28, gain: 0.07, type: 'triangle', glide: 0.7, lowpass: 1400, send: 0.28 })
    tone({ freq: NOTE.A4, at: 0.035, dur: 0.24, gain: 0.045, type: 'sine', glide: 0.72, send: 0.2 })
    tick({ dur: 0.05, gain: 0.026, freq: 1100, q: 0.7, send: 0.12 })
  },

  // Confirm: a low seal plus a rising pentatonic phrase — "accepted", calm.
  confirm() {
    tone({ freq: NOTE.A3, dur: 0.2, gain: 0.06, type: 'sine', lowpass: 500, send: 0.08 })
    tone({ freq: NOTE.C5, at: 0.01, dur: 0.14, gain: 0.075, type: 'triangle', lowpass: 2600, send: 0.24 })
    tone({ freq: NOTE.E5, at: 0.075, dur: 0.18, gain: 0.07, type: 'triangle', lowpass: 2600, send: 0.28 })
    tone({ freq: NOTE.A5, at: 0.145, dur: 0.34, gain: 0.055, type: 'sine', pan: 0.06, send: 0.4 })
  },

  // Chime: a real glass bell with a long tail, saved for the archive.
  chime() {
    bell({ freq: NOTE.A5, dur: 0.55, gain: 0.065, send: 0.42 })
    bell({ freq: NOTE.E6, at: 0.02, dur: 0.42, gain: 0.032, send: 0.4 })
    tone({ freq: NOTE.A4, dur: 0.5, gain: 0.032, type: 'sine', send: 0.2 })
  },

  // Error: muted low semitone beating, uneasy but never harsh.
  error() {
    tone({ freq: NOTE.Bb3, dur: 0.24, gain: 0.08, type: 'triangle', lowpass: 620, send: 0.12 })
    tone({ freq: NOTE.B3, at: 0.012, dur: 0.22, gain: 0.042, type: 'sine', lowpass: 520, send: 0.12 })
    tone({ freq: 116.54, at: 0.01, dur: 0.28, gain: 0.045, type: 'sine', lowpass: 320, send: 0.05 })
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
