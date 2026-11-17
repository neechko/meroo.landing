/**
 * One parser for every YouTube URL shape the site can receive.
 *
 * Discord activities, Lanyard metadata and "open source" links can arrive as
 * `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` or `/live/`. Keeping the
 * extraction here means the BGM player and the "play here" dialog can never
 * disagree about whether a track is playable.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const THUMBNAIL_ID = /i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\//i

function accept(id: string | null | undefined): string {
  return id && VIDEO_ID.test(id) ? id : ''
}

/** Video id from a YouTube page, share link or embed URL. */
export function youtubeIdFrom(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const parsed = new URL(url, 'https://www.youtube.com')

    if (parsed.hostname.endsWith('youtu.be')) {
      return accept(parsed.pathname.split('/').filter(Boolean)[0])
    }

    if (
      parsed.hostname.endsWith('youtube.com') ||
      parsed.hostname.endsWith('youtube-nocookie.com')
    ) {
      if (parsed.pathname === '/watch') return accept(parsed.searchParams.get('v'))
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
        return accept(parts[1])
      }
    }
  } catch {
    // Not a URL we can turn into a video id.
  }
  return ''
}

/**
 * Video id from a YouTube thumbnail. Discord sometimes only exposes the cover
 * (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`) and no watch URL at all, so
 * this keeps the track playable in that case.
 */
export function youtubeIdFromThumbnail(url: string | null | undefined): string {
  if (!url) return ''
  return accept(url.match(THUMBNAIL_ID)?.[1])
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
}
