import { motion } from 'framer-motion'
import { ExternalLink, Music2, RotateCcw, Volume2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AlbumArt } from './presence-parts'

/**
 * Discord only shares metadata, never audio. So "play here" mounts the
 * provider's own embed: Spotify for Spotify tracks, YouTube for YouTube Music.
 *
 * For YouTube the frame is intentionally invisible (audio-only) and the HUD
 * shows its own artwork + equalizer instead of the video. Opening this dialog
 * is a real click, which is what lets the browser autoplay the audio.
 */
export default function MusicPlayer({ track, onClose }) {
  const [playerKey, setPlayerKey] = useState(0)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!track) return null

  const isYouTube = track.embedKind === 'youtube'

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
        aria-label="Close music player"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#04030a]/80 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="hud-panel relative w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-200">
              <Music2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p id="player-title" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/90">
                Playing from {track.source}
              </p>
              <p className="truncate text-[10px] text-zinc-500">
                {track.title}
                {track.artist ? ` · ${track.artist}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {isYouTube ? (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.2),transparent_70%)] px-4 py-5">
              <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

              <div className="relative flex items-center gap-4">
                <div className="relative shrink-0">
                  <span className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl" />
                  <AlbumArt
                    src={track.art}
                    alt={track.album || track.title}
                    className="relative h-[72px] w-[72px]"
                    rounded="rounded-2xl"
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-emerald-300/40 bg-emerald-500/20 text-emerald-200 backdrop-blur">
                    <Volume2 className="h-3 w-3" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[16px] font-semibold text-white">
                    {track.title}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">
                    {[track.artist, track.album].filter(Boolean).join(' · ') || 'Unknown artist'}
                  </p>
                  <div className="mt-2 flex items-end gap-[3px] text-violet-300" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <span
                        key={index}
                        className="w-[3px] rounded-full bg-current"
                        style={{
                          height: `${6 + ((index * 7) % 15)}px`,
                          animation: `eq 0.9s ease-in-out ${(index % 6) * -0.13}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlayerKey((value) => value + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-500/25 active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restart audio
                </button>
                {track.external ? (
                  <a
                    href={track.external}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-zinc-300 transition hover:border-white/20 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                ) : null}
              </div>

              {/* Audio only: the frame is 1px and invisible, but still mounted
                  inside the viewport so the browser keeps playing it. */}
              <div className="pointer-events-none absolute bottom-0 left-0 h-px w-px overflow-hidden opacity-0" aria-hidden="true">
                <iframe
                  key={playerKey}
                  src={track.embed}
                  title={`${track.title} audio`}
                  tabIndex={-1}
                  allow="autoplay; encrypted-media"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="h-px w-px"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <AlbumArt
                  src={track.art}
                  alt={track.album || track.title}
                  className="h-14 w-14"
                  rounded="rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] font-semibold text-white">
                    {track.title}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">
                    {[track.artist, track.album].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {track.external ? (
                  <a
                    href={track.external}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                ) : null}
              </div>

              {track.embed ? (
                <iframe
                  src={track.embed}
                  title={`${track.title} on ${track.source}`}
                  className="mt-4 h-[152px] w-full rounded-xl border border-white/10 bg-black"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              ) : null}
            </>
          )}

          <p className="mt-3 text-[9.5px] leading-relaxed text-zinc-600">
            {isYouTube
              ? 'Audio only — the video stays hidden. Playback depends on the track being available in your region. If it stays silent, press Restart audio or open the source.'
              : 'Discord shares the track info, not the audio. Playback happens inside the provider’s player and depends on your region.'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
