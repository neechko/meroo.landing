import { useEffect, useState } from 'react'
import type { BgmController, BgmSource, BgmState, NowPlaying } from '../types'
import { youtubeIdFrom } from './youtube'

/**
 * Background music with two possible sources:
 *
 *   default → the local Castorice track, used when Discord is offline or
 *             nothing is playing there.
 *   discord → when Lanyard reports a YouTube track, the same song becomes the
 *             BGM. Discord only shares metadata, so the audio comes from a
 *             hidden YouTube player (the video itself is never shown).
 *
 * Some rights holders disable embedding entirely (YouTube error 150). When
 * that happens the module keeps the music playing by switching to the local
 * track and records the skipped song, so the HUD can say why.
 *
 * Both paths share one volume and one pause state, so the header toggle always
 * controls "the music" regardless of where it currently comes from.
 *
 * Only one source may ever be audible. Every transition explicitly pauses the
 * other one, and a single in-flight YouTube build is reused instead of mounting
 * a second player when presence updates arrive quickly.
 */

/**
 * Minimal shapes for the parts of the YouTube IFrame API this module uses.
 * The script is injected at runtime, so these globals ship without types.
 */
interface YouTubePlayer {
  stopVideo: () => void
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  setVolume: (volume: number) => void
  destroy: () => void
}

interface YouTubePlayerEvent {
  target: YouTubePlayer
  /** Present on `onError`: 2, 5, 100, 101 or 150. */
  data?: number
}

interface YouTubeStateChangeEvent {
  target: YouTubePlayer
  data: number
}

interface YouTubePlayerVars {
  autoplay?: number
  controls?: number
  disablekb?: number
  modestbranding?: number
  playsinline?: number
  rel?: number
  loop?: number
  playlist?: string
  origin?: string
}

interface YouTubePlayerOptions {
  width?: string | number
  height?: string | number
  videoId: string
  playerVars?: YouTubePlayerVars
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void
    onStateChange?: (event: YouTubeStateChangeEvent) => void
    onError?: (event: YouTubePlayerEvent) => void
  }
}

interface YouTubePlayerConstructor {
  new (element: HTMLElement, options: YouTubePlayerOptions): YouTubePlayer
}

interface YouTubeApi {
  Player: YouTubePlayerConstructor
}

declare global {
  interface Window {
    /** Present only once `https://www.youtube.com/iframe_api` has loaded. */
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

const DEFAULT_URL = '/music/castorice-epitaph.mp3'
// Music sits at 80% of full scale; the UI samples run through their own 60%
// master, so the effects still cut through the track.
const DEFAULT_VOLUME = 0.1
const YT_VOLUME = 60
const YT_API_TIMEOUT = 12_000
const YT_READY_TIMEOUT = 15_000
// YouTube errors 2/100/101/150 mean the embed can never play this video
// (bad id, removed/private, embedding disabled), so retrying is pointless.
// Anything else (5, network timeouts) may be temporary and is retried later.
const PERMANENT_ERRORS = new Set([2, 100, 101, 150])
const TRANSIENT_RETRY_MS = 90_000

let audio: HTMLAudioElement | null = null
let started = false
let userPaused = false
let ducked = false

let source: BgmSource = 'default' // 'default' | 'discord'
let currentVideoId = ''
let currentTitle = ''
let currentArtist = ''

let ytPlayer: YouTubePlayer | null = null
let ytState = -1
let ytHost: HTMLElement | null = null
let ytApiPromise: Promise<YouTubeApi> | null = null
let ytToken = 0
let ytBuilding: Promise<YouTubePlayer> | null = null
let ytBuildingId = ''
// Video id → when it may be tried again (or never). Without this, every 20s
// presence poll would rebuild the same broken player.
const blockedVideoIds = new Map<string, { until: number; permanent: boolean }>()
// Title of the Discord track that YouTube refused to embed. Empty while the
// reported track either plays normally or no music activity is present.
let skippedTitle = ''
// Video id behind `skippedTitle`, kept so the header button can retry it.
let skippedVideoId = ''

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // A listener throwing should not stop the others.
    }
  })
}

/**
 * Remembers a failed video. Permanent failures never retry; transient ones
 * (timeouts, network hiccups) become eligible again after a cooldown.
 */
function markBlocked(videoId: string, permanent: boolean): void {
  if (!videoId) return
  blockedVideoIds.set(videoId, {
    until: permanent ? Number.POSITIVE_INFINITY : Date.now() + TRANSIENT_RETRY_MS,
    permanent,
  })
}

function blockState(videoId: string): 'ok' | 'transient' | 'permanent' {
  const entry = blockedVideoIds.get(videoId)
  if (!entry) return 'ok'
  if (entry.permanent) return 'permanent'
  if (Date.now() < entry.until) return 'transient'
  blockedVideoIds.delete(videoId)
  return 'ok'
}

function isPermanentError(code: number | undefined): boolean {
  return code !== undefined && PERMANENT_ERRORS.has(code)
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (audio) return audio

  audio = new Audio(DEFAULT_URL)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = DEFAULT_VOLUME
  audio.addEventListener('play', emit)
  audio.addEventListener('pause', emit)
  audio.addEventListener('volumechange', emit)
  return audio
}

/** The local track is the only thing this module plays directly. */
function stopLocal(): void {
  if (!audio) return
  try {
    audio.pause()
  } catch {
    // Ignore; the element may already be torn down.
  }
}

function playDefault(): void {
  if (source === 'discord') return
  const track = ensureAudio()
  if (!track) return
  if (track.paused) {
    track.play().catch(() => {
      // Autoplay was blocked; the header toggle can retry it later.
    })
  }
}

function stopYouTube(): void {
  if (!ytPlayer) return
  try {
    ytPlayer.stopVideo()
  } catch {
    // The player may already be gone.
  }
  try {
    ytPlayer.pauseVideo()
  } catch {
    // Ignore.
  }
}

/**
 * Fully tears down the hidden YouTube player. Bumping the token also makes any
 * in-flight build ignore its own late callbacks, so a stale player can never
 * attach itself or start playing after a fallback/track change.
 */
function destroyYouTube(): void {
  ytToken += 1
  const player = ytPlayer
  ytPlayer = null
  ytState = -1
  ytBuilding = null
  ytBuildingId = ''

  if (player) {
    try {
      player.stopVideo()
    } catch {
      // Ignore.
    }
    try {
      player.pauseVideo()
    } catch {
      // Ignore.
    }
    try {
      player.destroy()
    } catch {
      // Some players refuse to destroy before they are ready.
    }
  }

  // Remove leftover iframes/mounts from players that failed to initialise.
  if (ytHost) {
    try {
      ytHost.replaceChildren()
    } catch {
      ytHost.textContent = ''
    }
  }
}

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('YouTube API timed out'))
    }, YT_API_TIMEOUT)

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.()
      } catch {
        // Another callback failing should not block ours.
      }
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      const api = window.YT
      if (!api) {
        reject(new Error('YouTube API unavailable'))
        return
      }
      resolve(api)
    }

    const existing = document.querySelector('script[data-bgm-youtube]')
    if (existing) {
      existing.addEventListener(
        'error',
        () => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          reject(new Error('YouTube API failed to load'))
        },
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.bgmYoutube = '1'
    script.onerror = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      reject(new Error('YouTube API failed to load'))
    }
    document.head.appendChild(script)
  })

  // A failed load should be retryable: clear the cache and the dead tag so the
  // next attempt can insert a fresh script instead of reusing the rejection.
  ytApiPromise.catch(() => {
    ytApiPromise = null
    try {
      document.querySelector('script[data-bgm-youtube]')?.remove()
    } catch {
      // Ignore.
    }
  })

  return ytApiPromise
}

function ensureYouTubeHost(): HTMLElement {
  if (ytHost) return ytHost
  const host = document.createElement('div')
  host.id = 'bgm-youtube'
  host.setAttribute('aria-hidden', 'true')
  // Off-screen but still "visible" so the browser keeps decoding audio.
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;'
  document.body.appendChild(host)
  ytHost = host
  return host
}

/**
 * Creates the hidden YouTube player once. Concurrent calls for the same video
 * share the same promise, so rapid presence updates cannot stack players.
 */
function buildYouTubePlayer(videoId: string): Promise<YouTubePlayer> {
  if (ytPlayer) return Promise.resolve(ytPlayer)
  if (ytBuilding) {
    if (ytBuildingId === videoId) return ytBuilding
    destroyYouTube()
  }

  const token = ytToken

  const pending = loadYouTubeApi().then(
    (YT) =>
      new Promise<YouTubePlayer>((resolve, reject) => {
        if (token !== ytToken) {
          reject(new Error('YouTube build cancelled'))
          return
        }

        const host = ensureYouTubeHost()
        const mount = document.createElement('div')
        host.appendChild(mount)

        let settled = false
        let created: YouTubePlayer | null = null

        const fail = (error: unknown) => {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          if (created) {
            try {
              created.stopVideo()
            } catch {
              // Ignore.
            }
            try {
              created.pauseVideo()
            } catch {
              // Ignore.
            }
            try {
              created.destroy()
            } catch {
              // Ignore.
            }
          }
          try {
            mount.remove()
          } catch {
            // Ignore.
          }
          reject(error)
        }

        // onReady never fires when embedding is blocked; do not wait forever.
        const timer = window.setTimeout(
          () => fail(new Error('YouTube player did not start')),
          YT_READY_TIMEOUT,
        )

        try {
          created = new YT.Player(mount, {
            width: '2',
            height: '2',
            videoId,
            playerVars: {
              // Never let the embed start on its own: playback is always
              // gated by the header toggle / first gesture.
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              loop: 1,
              playlist: videoId,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                if (token !== ytToken) {
                  fail(new Error('YouTube build superseded'))
                  return
                }
                if (source !== 'discord' || currentVideoId !== videoId) {
                  fail(new Error('YouTube track changed'))
                  return
                }
                if (settled) {
                  try {
                    event.target.stopVideo()
                    event.target.destroy?.()
                  } catch {
                    // Ignore.
                  }
                  return
                }

                settled = true
                window.clearTimeout(timer)
                ytPlayer = event.target
                ytState = -1
                try {
                  ytPlayer.setVolume(YT_VOLUME)
                } catch {
                  // Older players ignore volume until playback starts.
                }
                if (started && !userPaused && !ducked) {
                  try {
                    ytPlayer.playVideo()
                  } catch {
                    // The state listener will settle it.
                  }
                }
                emit()
                resolve(event.target)
              },
              onStateChange: (event) => {
                if (token !== ytToken) return
                ytState = event.data
                if (event.data === 0 && started && !userPaused && !ducked) {
                  try {
                    event.target.seekTo(0)
                    event.target.playVideo()
                  } catch {
                    // If looping fails, falling back is better than silence.
                    fallbackToDefault(videoId)
                  }
                }
                emit()
              },
              onError: (event) => {
                if (token !== ytToken) return
                fallbackToDefault(videoId, isPermanentError(event.data))
              },
            },
          })
        } catch (error) {
          fail(error)
        }
      }),
  )

  ytBuilding = pending
  ytBuildingId = videoId
  const clear = () => {
    if (ytBuilding === pending) {
      ytBuilding = null
      ytBuildingId = ''
    }
  }
  pending.then(clear, clear)
  return pending
}

/**
 * Gives up on the selected Discord video.
 *
 * A permanent block (embedding disabled, video removed) still has to leave the
 * site with music, so the local track takes over and the skipped song is
 * remembered for the HUD. A transient failure does the same swap but without a
 * note, and the video is retried after a cooldown.
 */
function fallbackToDefault(failedId = '', permanent = false): void {
  if (failedId) markBlocked(failedId, permanent)

  if (permanent && failedId) {
    skippedTitle = currentTitle || 'Discord track'
    skippedVideoId = failedId
  } else {
    skippedTitle = ''
    skippedVideoId = ''
  }

  source = 'default'
  currentVideoId = ''
  currentTitle = ''
  currentArtist = ''
  destroyYouTube()
  emit()
  if (started && !userPaused && !ducked) playDefault()
}

/** Starts whichever source is selected, pausing the other one first. */
function startCurrent(): void {
  if (!started) return

  if (source === 'discord' && currentVideoId) {
    stopLocal()

    if (ytPlayer) {
      try {
        ytPlayer.setVolume(YT_VOLUME)
        ytPlayer.playVideo()
      } catch {
        fallbackToDefault(currentVideoId)
      }
      return
    }

    const videoId = currentVideoId
    buildYouTubePlayer(videoId)
      .then((player) => {
        // A newer track may have superseded this build while it was loading.
        if (source !== 'discord' || currentVideoId !== videoId) return
        if (player !== ytPlayer) return
        if (!started || userPaused || ducked) {
          try {
            player.pauseVideo()
          } catch {
            // Ignore.
          }
          return
        }
        try {
          player.setVolume(YT_VOLUME)
          player.playVideo()
        } catch {
          fallbackToDefault(videoId)
        }
      })
      .catch(() => {
        // Only fall back if this is still the track we want and nothing newer
        // is already loading; a superseded build must stay silent.
        if (
          source === 'discord' &&
          currentVideoId === videoId &&
          !ytPlayer &&
          !ytBuilding
        ) {
          fallbackToDefault(videoId)
        }
      })
    return
  }

  stopYouTube()
  playDefault()
}

/** Pauses every source, not just the selected one, so nothing overlaps. */
function pauseCurrent(): void {
  stopLocal()
  if (ytPlayer) {
    try {
      ytPlayer.pauseVideo()
    } catch {
      // Ignore; the state listener will settle it.
    }
  }
}

/**
 * Points the BGM at the track Lanyard currently reports.
 * `null` (or a non-YouTube source) restores the default local track.
 */
export function setBgmTrack(track: NowPlaying | null): void {
  const videoId = track ? youtubeIdFrom(track.embed || track.external) : ''

  if (!track || !videoId) {
    if (source !== 'default' || ytPlayer || ytBuilding || skippedTitle) fallbackToDefault()
    return
  }

  const blocked = blockState(videoId)

  if (blocked === 'permanent') {
    // YouTube will not embed this track. Music keeps playing from the local
    // file, and `skippedTitle` lets the HUD name the song it replaced. The
    // early return avoids tearing the local player down on every 20s poll.
    const title = track.title ?? ''
    const changed =
      skippedTitle !== title || source !== 'default' || Boolean(ytPlayer) || Boolean(ytBuilding)

    skippedTitle = title || 'Discord track'
    skippedVideoId = videoId
    source = 'default'
    currentVideoId = ''
    currentTitle = ''
    currentArtist = ''

    if (changed) {
      destroyYouTube()
      emit()
      if (started && !userPaused && !ducked) playDefault()
    }
    return
  }

  if (blocked === 'transient') {
    // Tried recently and failed for a non-permanent reason: stay on the local
    // track until the cooldown expires instead of rebuilding every poll.
    if (source !== 'default' || ytPlayer || ytBuilding || skippedTitle) fallbackToDefault()
    return
  }

  skippedTitle = ''
  skippedVideoId = ''
  const title = track.title ?? ''
  const artist = track.artist ?? ''

  if (source === 'discord' && currentVideoId === videoId) {
    currentTitle = title
    currentArtist = artist
    if (started && !userPaused && !ducked) startCurrent()
    emit()
    return
  }

  source = 'discord'
  currentVideoId = videoId
  currentTitle = title
  currentArtist = artist

  stopLocal()
  // Rebuild for the new id instead of reusing a player that may still be
  // buffering the previous video.
  destroyYouTube()

  // Before the first gesture we only remember the choice; `startBgm` mounts
  // the player inside the click so autoplay is allowed. Warming the API now
  // means the player can be created immediately inside that click instead of
  // waiting for a fresh script download.
  if (!started) {
    loadYouTubeApi().catch(() => {
      // If it never loads, `startBgm` falls back to the local track.
    })
    emit()
    return
  }

  startCurrent()
  emit()
}

/**
 * Starts the site BGM. Must be called from a user gesture (the Enter button)
 * so browsers allow playback; every later call is a no-op.
 */
export function startBgm(): void {
  if (typeof window === 'undefined') return
  if (started) return
  started = true
  userPaused = false
  startCurrent()
  emit()
}

export function toggleBgm(): void {
  if (typeof window === 'undefined') return
  if (!started) {
    startBgm()
    return
  }

  if (getBgmState().playing) {
    userPaused = true
    pauseCurrent()
  } else {
    userPaused = false
    startCurrent()
  }
  emit()
}

/**
 * Re-attempts the Discord track YouTube refused to embed. Kept separate from
 * the header toggle so that button always means pause/play.
 */
export function retrySkippedBgm(): void {
  if (typeof window === 'undefined') return
  const videoId = skippedVideoId
  if (!videoId) return

  const title = skippedTitle
  blockedVideoIds.delete(videoId)
  skippedTitle = ''
  skippedVideoId = ''
  source = 'discord'
  currentVideoId = videoId
  currentTitle = title
  currentArtist = ''
  userPaused = false
  startCurrent()
  emit()
}

/** Used while the "play here" dialog is open so two players never overlap. */
export function pauseBgmForPlayer(): void {
  if (typeof window === 'undefined') return
  ducked = true
  pauseCurrent()
  emit()
}

export function resumeBgmAfterPlayer(): void {
  if (typeof window === 'undefined') return
  ducked = false
  if (started && !userPaused) startCurrent()
  emit()
}

/**
 * True when the page runs on an IP literal. YouTube rejects embeds there
 * (error 150), even for videos that play fine on the deployed domain.
 */
export function isIpOrigin(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === '[::1]' || host === '::1'
}

export function getBgmState(): BgmState {
  const playing =
    source === 'discord'
      ? Boolean(ytPlayer) && (ytState === 1 || ytState === 3)
      : Boolean(audio && !audio.paused)

  return {
    started,
    playing,
    source,
    title:
      source === 'discord' ? currentTitle || 'Discord track' : 'Castorice: Epitaph',
    artist: source === 'discord' ? currentArtist : '',
    ready: source === 'discord' ? Boolean(ytPlayer) : Boolean(audio),
    skipped: skippedTitle,
  }
}

export function subscribeBgm(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBgm(): BgmController {
  const [state, setState] = useState(getBgmState)

  useEffect(() => subscribeBgm(() => setState(getBgmState())), [])

  return {
    ...state,
    start: startBgm,
    toggle: toggleBgm,
  }
}
