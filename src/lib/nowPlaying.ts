import type { NowPlaying, Presence } from '../types'
import { isCustomStatus, isMusicActivity, musicTrack } from './format'
import { youtubeEmbedUrl, youtubeIdFrom, youtubeIdFromThumbnail } from './youtube'

/**
 * One shape for every music source:
 * Spotify (native Lanyard field) or any other "Listening" activity such as
 * YouTube Music, Apple Music, or SoundCloud. Discord never exposes audio,
 * only metadata, so the HUD can embed the original track for playback.
 */
export function getNowPlaying(presence: Presence | null | undefined): NowPlaying | null {
  const spotify = presence?.listening_to_spotify ? presence.spotify : null

  if (spotify) {
    const realTrack = spotify.track_id && !spotify.track_id.startsWith('demo')
    return {
      source: 'Spotify',
      title: spotify.song,
      artist: spotify.artist,
      album: spotify.album,
      art: spotify.album_art_url,
      external: realTrack ? `https://open.spotify.com/track/${spotify.track_id}` : '',
      embed: realTrack
        ? `https://open.spotify.com/embed/track/${spotify.track_id}?utm_source=generator&theme=0`
        : '',
      embedKind: 'spotify',
      progress: spotify.timestamps?.end ? spotify.timestamps : null,
      startedAt: spotify.timestamps?.start ?? null,
    }
  }

  const activity = (presence?.activities ?? [])
    .filter((item) => !isCustomStatus(item))
    .find((item) => isMusicActivity(item))

  if (!activity) return null

  const track = musicTrack(activity)
  if (!track) return null

  // Discord usually links the track, but some clients only send the cover.
  // Falling back to the thumbnail keeps "play here" and the BGM in sync.
  const videoId = youtubeIdFrom(track.url) || youtubeIdFromThumbnail(track.art)

  return {
    source: track.app,
    title: track.title,
    artist: track.artist,
    album: track.album,
    art: track.art,
    external: track.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
    embed: videoId ? youtubeEmbedUrl(videoId) : '',
    embedKind: 'youtube',
    progress: activity.timestamps?.end ? activity.timestamps : null,
    startedAt: track.startedAt ?? null,
  }
}
