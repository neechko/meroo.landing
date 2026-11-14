/**
 * WebAudio sound engine for the HUD.
 *
 * The clicks are real samples (in `public/sfx/`) instead of synthesised tones.
 * They are decoded once into AudioBuffers and played through a single master
 * chain, which lets quiet source files be lifted to a consistent level and
 * keeps every interaction on the same volume scale. `data-sfx` overrides the
 * voice for a specific element.
 */

const STORAGE_KEY = 'meroo.sfx'
const THROTTLE_MS = 45
// UI effects sit at 85% of full scale, as requested.
const MASTER_VOLUME = 0.85

/**
 * `start` / `length` are measured from each file's decoded envelope, so the
 * dead air before a transient and the inaudible reverb tail are skipped.
 * `gain` compensates the very different export levels of the recordings so a
 * click, a page turn and a whoosh all peak around −5 dBFS before the master.
 */
const CLIPS = {
  click: {
    src: '/sfx/freesound_community-ui-click-97915.mp3',
    gain: 11.5,
    start: 0.25,
    length: 0.11,
  },
  confirm: {
    src: '/sfx/existentialtaco-confirm-tap-394001.mp3',
    gain: 0.9,
    start: 0.03,
    length: 0.45,
  },
  menu: {
    src: '/sfx/skyscraper_seven-click-buttons-ui-menu-sounds-effects-button-8-205394.mp3',
    gain: 9.7,
    start: 0.01,
    length: 0.62,
  },
  page: {
    src: '/sfx/oxidvideos-papernext-page-videogame-sfx-449926.mp3',
    gain: 2.6,
    start: 0.01,
    length: 0.56,
  },
  whoosh: {
    src: '/sfx/ksjsbwuil-whoosh3-481204.mp3',
    gain: 0.76,
    start: 0.02,
    length: 1.15,
  },
}

let ctx = null
let master = null
let enabled = true
let lastPlayed = 0
let buffers = null
let loading = null
const active = new Set()

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
  master.gain.value = MASTER_VOLUME

  // A limiter is the safety net for stacked clicks (tap + whoosh at the same
  // moment on the intro); it should never be audible on its own.
  try {
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 6
    limiter.ratio.value = 6
    limiter.attack.value = 0.003
    limiter.release.value = 0.18
    master.connect(limiter)
    limiter.connect(ctx.destination)
  } catch {
    master.connect(ctx.destination)
  }

  return ctx
}

function loadClips() {
  if (buffers) return Promise.resolve(buffers)
  if (loading) return loading

  const context = ensure()
  if (!context) return Promise.resolve(null)

  loading = Promise.all(
    Object.entries(CLIPS).map(async ([key, def]) => {
      try {
        const response = await fetch(def.src, { cache: 'force-cache' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.arrayBuffer()
        const buffer = await context.decodeAudioData(data)
        return [key, { buffer }]
      } catch {
        // A missing file should never break the interaction; that voice just
        // stays silent.
        return null
      }
    }),
  ).then((entries) => {
    buffers = new Map(entries.filter(Boolean))
    loading = null
    return buffers
  })

  return loading
}

function playClip(key, { rate = 1, gain = 1, delay = 0, start, length } = {}) {
  const def = CLIPS[key]
  if (!def) return

  const fire = () => {
    if (!enabled || !buffers) return
    const prepared = buffers.get(key)
    if (!prepared) return

    const context = ensure()
    if (!context) return

    const total = prepared.buffer.duration
    const offset = Math.min(start ?? def.start ?? 0, Math.max(0, total - 0.02))
    const keep = Math.min(length ?? def.length ?? total - offset, total - offset)
    const duration = Math.max(0.03, keep / rate)

    const at = context.currentTime
    const source = context.createBufferSource()
    source.buffer = prepared.buffer
    source.playbackRate.value = rate

    const amp = context.createGain()
    const level = def.gain * gain
    amp.gain.value = level

    source.connect(amp)
    amp.connect(master)

    source.start(at, offset)
    source.stop(at + duration + 0.02)

    // Short fade so a trimmed recording never ends on a hard edge.
    const end = at + duration
    amp.gain.setValueAtTime(level, Math.max(at, end - 0.03))
    amp.gain.exponentialRampToValueAtTime(0.0001, end)

    active.add(source)
    source.onended = () => active.delete(source)
  }

  if (delay > 0) {
    if (typeof window !== 'undefined') window.setTimeout(fire, delay)
  } else {
    fire()
  }
}

const VOICES = {
  tap() {
    playClip('click')
  },

  tab() {
    playClip('page', { gain: 0.85 })
  },

  toggle() {
    playClip('menu', { gain: 0.9 })
  },

  link() {
    playClip('confirm', { gain: 0.6, rate: 1.08 })
  },

  open() {
    playClip('page', { gain: 1, rate: 0.94 })
  },

  close() {
    playClip('menu', { gain: 0.8, rate: 0.88 })
  },

  confirm() {
    playClip('confirm')
  },

  chime() {
    playClip('confirm', { gain: 0.8 })
    playClip('confirm', { gain: 0.45, rate: 1.35, delay: 70 })
  },

  error() {
    playClip('menu', { gain: 0.85, rate: 0.76 })
    playClip('menu', { gain: 0.6, rate: 0.62, delay: 90 })
  },

  // The door: one long airy sweep when "press anywhere" starts the warp.
  warp() {
    playClip('whoosh')
  },
}

export function playSfx(name = 'tap') {
  if (!enabled) return
  if (typeof window === 'undefined') return
  if (name === 'none' || name === 'silent') return
  if (typeof performance !== 'undefined' && performance.now() - lastPlayed < THROTTLE_MS) return

  const voice = VOICES[name] ?? VOICES.tap
  const context = ensure()
  if (!context) return

  lastPlayed = typeof performance !== 'undefined' ? performance.now() : Date.now()

  if (!buffers) {
    // First interaction can land before the tiny mp3s finish decoding; play it
    // once they are ready instead of dropping the very first click.
    loadClips()?.then(() => {
      if (enabled) {
        try {
          voice()
        } catch {
          // Never break the interaction.
        }
      }
    })
    return
  }

  // Resume in case the browser suspended the context; samples scheduled while
  // suspended would otherwise land in the past.
  if (context.state === 'running') {
    try {
      voice()
    } catch {
      // Never break the interaction.
    }
  } else {
    context
      .resume()
      .then(() => {
        if (!enabled) return
        try {
          voice()
        } catch {
          // Never break the interaction.
        }
      })
      .catch(() => {})
  }
}

export function setSfxEnabled(value) {
  enabled = Boolean(value)
  if (!enabled) {
    for (const source of active) {
      try {
        source.stop()
      } catch {
        // Already stopped.
      }
    }
    active.clear()
  }
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

  // Decode the samples while the preloader is still on screen, so the first
  // click already has a buffer to play.
  loadClips()

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
    const activeElement = document.activeElement
    if (!(activeElement instanceof Element) || !activeElement.matches(INTERACTIVE)) return
    playSfx(resolveSound(activeElement))
  }

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
  document.addEventListener('keydown', onKeyDown, true)

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
  }
}
