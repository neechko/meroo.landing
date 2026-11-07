/**
 * Preview data for local development. Used when discordUserId is empty or
 * Lanyard is unreachable, and only enabled in dev builds. The shape matches
 * the real Lanyard response so every component renders without extra branches.
 */
export function createDemoPresence() {
  const now = Date.now()

  return {
    active: true,
    discord_status: 'online',
    active_on_discord_desktop: true,
    active_on_discord_mobile: false,
    active_on_discord_web: false,
    listening_to_spotify: true,
    discord_user: {
      id: '0',
      username: 'meroo__',
      global_name: 'meroo',
      discriminator: '0',
      avatar: null,
      avatar_decoration_data: null,
    },
    activities: [
      {
        id: 'demo-custom',
        name: 'Custom Status',
        type: 4,
        state: 'late night coding 🌙',
        created_at: now - 1000 * 60 * 42,
      },
      {
        id: 'demo-vscode',
        name: 'Visual Studio Code',
        type: 0,
        application_id: '383226320970055681',
        details: 'Editing App.jsx',
        state: 'meroo-landing — src',
        created_at: now - 1000 * 60 * 134,
        timestamps: { start: now - 1000 * 60 * 134 },
      },
    ],
    spotify: {
      track_id: 'demo-track',
      song: 'Midnight Coding',
      artist: 'meroo.fm',
      album: 'Late Night Sessions',
      album_art_url: '/demo-cover.svg',
      timestamps: {
        start: now - 1000 * 72,
        end: now + 1000 * 108,
      },
    },
    kv: {},
  }
}
