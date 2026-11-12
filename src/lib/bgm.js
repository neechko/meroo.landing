import { useEffect, useState } from 'react'

const TRACK_URL = '/music/castorice-epitaph.mp3'
const DEFAULT_VOLUME = 0.34

let audio = null
let started = false
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function ensureAudio() {
  if (typeof window === 'undefined') return null
  if (audio) return audio

  audio = new Audio(TRACK_URL)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = DEFAULT_VOLUME
  audio.addEventListener('play', emit)
  audio.addEventListener('pause', emit)
  audio.addEventListener('volumechange', emit)
  return audio
}

/**
 * Starts the site BGM. Must be called from a user gesture (the Enter button)
 * so browsers allow playback; every later call is a no-op.
 */
export function startBgm() {
  const track = ensureAudio()
  if (!track) return
  started = true
  if (track.paused) {
    track.play().catch(() => {
      // Autoplay was blocked; the header toggle can retry it later.
    })
  }
  emit()
}

export function toggleBgm() {
  const track = ensureAudio()
  if (!track) return
  if (track.paused) {
    started = true
    track.play().catch(() => {})
  } else {
    track.pause()
  }
  emit()
}

export function getBgmState() {
  return {
    started,
    playing: Boolean(audio && !audio.paused),
  }
}

export function subscribeBgm(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBgm() {
  const [state, setState] = useState(getBgmState)

  useEffect(() => subscribeBgm(() => setState(getBgmState())), [])

  return {
    ...state,
    start: startBgm,
    toggle: toggleBgm,
  }
}
