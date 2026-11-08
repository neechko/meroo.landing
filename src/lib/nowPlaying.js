import { isCustomStatus, isMusicActivity, musicTrack } from './format'

function youtubeEmbed(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.hostname.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : ''
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : ''
    }
  } catch {
    // Not a URL we can embed; the card falls back to an external link.
  }
  return ''
}

/**
 * One shape for every music source:
 * Spotify (native Lanyard field) or any other "Listening" activity such as
 * YouTube Music, Apple Music, or SoundCloud. Discord never exposes audio,
 * only metadata, so the HUD can embed the original track for playback.
 */
export function getNowPlaying(presence) {
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
      embed: realTrack ? `https://open.spotify.com/embed/track/${spotify.track_id}?utm_source=generator&theme=0` : '',
      embedKind: 'spotify',
      progress: spotify.timestamps?.end ? spotify.timestamps : null,
      startedAt: spotify.timestamps?.start ?? null,
    }
  }

  const activity = (presence?.activities ?? [])
    .filter((item) => !isCustomStatus(item))
    .find(isMusicActivity)

  if (!activity) return null

  const track = musicTrack(activity)
  return {
    source: track.app,
    title: track.title,
    artist: track.artist,
    album: track.album,
    art: track.art,
    external: track.url,
    embed: youtubeEmbed(track.url),
    embedKind: 'youtube',
    progress: activity.timestamps?.end ? activity.timestamps : null,
    startedAt: track.startedAt ?? null,
  }
}
