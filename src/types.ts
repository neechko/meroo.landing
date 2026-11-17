/**
 * Shared domain types for the whole app.
 *
 * The shapes mirror the payloads the site actually receives (Lanyard,
 * `/api/mal`, the GitHub REST API) so components and hooks can pass data
 * around without re-declaring partial copies.
 */

export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface DiscordUser {
  id: string
  username: string
  global_name?: string | null
  discriminator?: string
  avatar?: string | null
  avatar_decoration_data?: Record<string, unknown> | null
}

export interface ActivityEmoji {
  name?: string
  id?: string
  animated?: boolean
}

export interface ActivityAssets {
  large_image?: string
  large_text?: string
  small_image?: string
  small_text?: string
}

export interface ActivityTimestamps {
  start?: number
  end?: number
}

export interface DiscordActivity {
  id?: string
  name?: string
  type?: number
  application_id?: string
  details?: string
  state?: string
  details_url?: string
  created_at?: number
  timestamps?: ActivityTimestamps
  assets?: ActivityAssets
  emoji?: ActivityEmoji
  buttons?: string[]
}

export interface SpotifyTrack {
  track_id?: string
  song: string
  artist: string
  album: string
  album_art_url: string
  timestamps?: ActivityTimestamps
}

export interface Presence {
  active?: boolean
  discord_status: DiscordStatus
  active_on_discord_desktop?: boolean
  active_on_discord_mobile?: boolean
  active_on_discord_web?: boolean
  listening_to_spotify?: boolean
  discord_user: DiscordUser
  activities?: DiscordActivity[]
  spotify?: SpotifyTrack | null
  kv?: Record<string, string>
}

export type LanyardState = 'demo' | 'connecting' | 'live' | 'error'

/** Shared status word used by the GitHub and MyAnimeList hooks. */
export type LoadStatus = 'loading' | 'ready' | 'refreshing' | 'stale' | 'error' | 'unconfigured'

/** One shape for every music source (Spotify embed or YouTube embed). */
export interface NowPlaying {
  source: string
  title: string
  artist: string
  album: string
  art: string | null
  external: string
  embed: string
  embedKind: 'spotify' | 'youtube'
  progress: ActivityTimestamps | null
  startedAt: number | null
}

/** Normalised "Listening" activity used by the compact presence rows. */
export interface MusicTrack {
  title: string
  artist: string
  album: string
  art: string | null
  url: string
  app: string
  startedAt?: number
}

export interface Project {
  title: string
  description: string
  tags: string[]
  url: string
  homepage?: string
  stars?: number
  updatedAt?: string
  language?: string
  languageColor?: string
  accent: string
  icon: string
}

export interface ProjectNote {
  description?: string
  tags?: string[]
  accent?: string
}

export interface MalEntry {
  id?: number
  title: string
  image: string
  watched: number
  total: number
  score: number
  type: string
  airing: boolean
  genres: string[]
  updatedAt: number
  url: string
}

export type GpuTier = 'high' | 'medium' | 'low'

export interface GpuInfo {
  name: string
  vendor: string
  available: boolean
  software: boolean
  discrete: boolean
  integrated: boolean
  cores: number
  memory: number
  tier: GpuTier
  lite: boolean
}

export type BgmSource = 'default' | 'discord'

export interface BgmState {
  started: boolean
  playing: boolean
  source: BgmSource
  title: string
  artist: string
  ready: boolean
  /**
   * Title of a Discord track YouTube refused to embed. The local track plays
   * instead, and the HUD uses this to explain the substitution.
   */
  skipped: string
}

export interface BgmController extends BgmState {
  start: () => void
  toggle: () => void
}

export type SfxVoice =
  | 'tap'
  | 'tab'
  | 'toggle'
  | 'link'
  | 'open'
  | 'close'
  | 'confirm'
  | 'chime'
  | 'error'
  | 'warp'
  | 'none'
  | 'silent'

export type TutorialStep = 'activity' | 'github' | 'anime' | 'profile'

export interface SiteConfig {
  name: string
  displayName: string
  role: string
  motto: string
  location: string
  timezone: string
  email: string
  discordUserId: string
  demoFallback: boolean
  socials: {
    github: string
    website: string
  }
  hero: {
    subline: string
    tagline: string
  }
  roles: string[]
  bio: string[]
  skills: Record<string, string[]>
  github: {
    username: string
    limit: number
    featured: string[]
  }
  projectNotes: Record<string, ProjectNote>
  projects: Project[]
  myanimelist: {
    username: string
    limit: number
  }
  contact: {
    endpoint: string
  }
  anime: {
    character: string
    source: string
    label: string
  }
  offTheClock: {
    title: string
    description: string
    note: string
    tags: string[]
  }
}
