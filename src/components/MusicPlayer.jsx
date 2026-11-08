import { motion } from 'framer-motion'
import { ExternalLink, Music2, X } from 'lucide-react'
import { useEffect } from 'react'
import { AlbumArt } from './presence-parts'

/**
 * Discord only shares metadata, never audio. So "play here" opens the
 * original track in the provider's own embed: Spotify for Spotify tracks,
 * YouTube for YouTube Music links, and a plain link when neither is possible.
 */
export default function MusicPlayer({ track, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!track) return null

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
        className="hud-panel relative w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
              <Music2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p id="player-title" className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/90">
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
          <div className="flex items-center gap-3">
            <AlbumArt
              src={track.art}
              alt={track.album || track.title}
              className="h-14 w-14"
              rounded="rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-semibold text-white">{track.title}</p>
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

          {track.embedKind === 'youtube' ? (
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
              <iframe
                src={track.embed}
                title={`${track.title} on ${track.source}`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <iframe
              src={track.embed}
              title={`${track.title} on ${track.source}`}
              className="mt-4 h-[152px] w-full rounded-xl border border-white/10 bg-black"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          )}

          <p className="mt-3 text-[9.5px] leading-relaxed text-zinc-600">
            Discord shares the track info, not the audio. Playback happens inside the provider&apos;s
            player, so it depends on the track being available in your region. If it stays silent,
            press play inside the frame or use Open.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
