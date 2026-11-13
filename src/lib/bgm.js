import { useEffect, useState } from 'react'

/**
 * Background music with two possible sources:
 *
 *   default → the local Castorice track, used when Discord is offline or
 *             nothing is playing there.
 *   discord → when Lanyard reports a YouTube track, the same song becomes the
 *             BGM. Discord only shares metadata, so the audio comes from a
 *             hidden YouTube player (the video itself is never shown).
 *
 * Both paths share one volume and one pause state, so the header toggle always
 * controls "the music" regardless of where it currently comes from.
 *
 * Only one source may ever be audible. Every transition explicitly pauses the
 * other one, and a single in-flight YouTube build is reused instead of mounting
 * a second player when presence updates arrive quickly.
 */

const DEFAULT_URL = '/music/castorice-epitaph.mp3'
// The old level was 0.34; this is ~60% quieter while staying audible.
const DEFAULT_VOLUME = 0.14
const YT_VOLUME = 14
const YT_API_TIMEOUT = 12_000
const YT_READY_TIMEOUT = 9_000

let audio = null
let started = false
let userPaused = false
let ducked = false

let source = 'default' // 'default' | 'discord'
let currentVideoId = ''
let currentTitle = ''
let currentArtist = ''

let ytPlayer = null
let ytState = -1
let ytHost = null
let ytApiPromise = null
let ytToken = 0
let ytBuilding = null
let ytBuildingId = ''

const listeners = new Set()

function emit() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // A listener throwing should not stop the others.
    }
  })
}

function ensureAudio() {
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
function stopLocal() {
  if (!audio) return
  try {
    audio.pause()
  } catch {
    // Ignore; the element may already be torn down.
  }
}

function playDefault() {
  if (source === 'discord') return
  const track = ensureAudio()
  if (!track) return
  if (track.paused) {
    track.play().catch(() => {
      // Autoplay was blocked; the header toggle can retry it later.
    })
  }
}

function stopYouTube() {
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
function destroyYouTube() {
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

function youtubeIdFrom(url) {
  if (!url || typeof window === 'undefined') return ''
  try {
    const parsed = new URL(url, window.location.href)
    if (parsed.hostname.endsWith('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? ''
    }
    if (parsed.hostname.endsWith('youtube.com') || parsed.hostname.endsWith('youtube-nocookie.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v') ?? ''
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
        return parts[1] ?? ''
      }
    }
  } catch {
    // Not a URL we can turn into a video id.
  }
  return ''
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve, reject) => {
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
      resolve(window.YT)
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

function ensureYouTubeHost() {
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
function buildYouTubePlayer(videoId) {
  if (ytPlayer) return Promise.resolve(ytPlayer)
  if (ytBuilding) {
    if (ytBuildingId === videoId) return ytBuilding
    destroyYouTube()
  }

  const token = ytToken

  const pending = loadYouTubeApi().then(
    (YT) =>
      new Promise((resolve, reject) => {
        if (token !== ytToken) {
          reject(new Error('YouTube build cancelled'))
          return
        }

        const host = ensureYouTubeHost()
        const mount = document.createElement('div')
        host.appendChild(mount)

        let settled = false
        let created = null

        const fail = (error) => {
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
                    fallbackToDefault()
                  }
                }
                emit()
              },
              onError: () => {
                if (token !== ytToken) return
                fallbackToDefault()
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

function fallbackToDefault() {
  source = 'default'
  currentVideoId = ''
  currentTitle = ''
  currentArtist = ''
  destroyYouTube()
  emit()
  if (started && !userPaused && !ducked) playDefault()
}

/** Starts whichever source is selected, pausing the other one first. */
function startCurrent() {
  if (!started) return

  if (source === 'discord' && currentVideoId) {
    stopLocal()

    if (ytPlayer) {
      try {
        ytPlayer.setVolume(YT_VOLUME)
        ytPlayer.playVideo()
      } catch {
        fallbackToDefault()
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
          fallbackToDefault()
        }
      })
      .catch(() => {
        // Only fall back if this is still the track we want and nothing newer
        // is already loading; a superseded build must stay silent.
        if (source === 'discord' && currentVideoId === videoId && !ytPlayer && !ytBuilding) {
          fallbackToDefault()
        }
      })
    return
  }

  stopYouTube()
  playDefault()
}

/** Pauses every source, not just the selected one, so nothing overlaps. */
function pauseCurrent() {
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
export function setBgmTrack(track) {
  const videoId = track ? youtubeIdFrom(track.embed || track.external) : ''

  if (!videoId) {
    if (source !== 'default' || ytPlayer || ytBuilding) fallbackToDefault()
    return
  }

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
export function startBgm() {
  if (typeof window === 'undefined') return
  started = true
  userPaused = false
  startCurrent()
  emit()
}

export function toggleBgm() {
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

/** Used while the "play here" dialog is open so two players never overlap. */
export function pauseBgmForPlayer() {
  if (typeof window === 'undefined') return
  ducked = true
  pauseCurrent()
  emit()
}

export function resumeBgmAfterPlayer() {
  if (typeof window === 'undefined') return
  ducked = false
  if (started && !userPaused) startCurrent()
  emit()
}

export function getBgmState() {
  const playing =
    source === 'discord'
      ? Boolean(ytPlayer) && (ytState === 1 || ytState === 3)
      : Boolean(audio && !audio.paused)

  return {
    started,
    playing,
    source,
    title:
      source === 'discord' ? currentTitle || 'Discord track' : 'Castorice — Epitaph',
    artist: source === 'discord' ? currentArtist : '',
    ready: source === 'discord' ? Boolean(ytPlayer) : Boolean(audio),
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
