/**
 * Everything you need to edit lives in this file.
 *
 * Discord presence is read through Lanyard:
 *   1. Join https://discord.gg/lanyard. Lanyard can only read presence
 *      from members of its server.
 *   2. Copy your Discord User ID (Settings → Advanced → Developer Mode,
 *      then right-click your profile → Copy User ID).
 *   3. Put it in `.env.local` as VITE_DISCORD_USER_ID=123456789012345678.
 *
 * Demo data only appears in local development. Production builds always
 * show real data or an honest offline state.
 */

const envUserId = (import.meta.env.VITE_DISCORD_USER_ID ?? '').trim()
const demoFallback = import.meta.env.DEV && import.meta.env.VITE_DEMO_FALLBACK !== 'false'

export const site = {
  name: 'meroo__',
  displayName: 'meroo',
  role: "Castorice's husband",
  location: 'Indonesia',
  timezone: 'Asia/Jakarta',

  // Optional. Leave empty to hide the email button.
  email: '',

  // ── DISCORD ───────────────────────────────────────────────────────
  discordUserId: envUserId,
  demoFallback,

  // ── LINKS ─────────────────────────────────────────────────────────
  socials: {
    github: 'https://github.com/neechko',
  },

  // ── HERO ──────────────────────────────────────────────────────────
  tagline:
    'I am an ordinary person living in Indonesia, and I am certainly fortunate to have Castoris as my wife.',
  roles: [
    "Castorice's husband",
    'Interface tinkerer',
    'Castorice apologist',
    'Lo-fi enjoyer',
  ],

  // ── ABOUT ─────────────────────────────────────────────────────────
  bio: [
    'I build front-end interfaces for a living and spend an unreasonable amount of time nudging things one pixel at a time. Most of what I know came from breaking something, reading the docs, and rebuilding it until it made sense.',
    'This site is half portfolio, half excuse to mess around. The Discord card runs on Lanyard, the motion on Framer Motion, and my sleep schedule on poor decisions.',
  ],
  skills: {
    Frontend: ['React', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
    Backend: ['Node.js', 'Express', 'REST APIs', 'PostgreSQL'],
    Tools: ['Vite', 'Git', 'GitHub', 'Figma', 'Vercel'],
  },

  // ── PROJECTS ──────────────────────────────────────────────────────
  projects: [
    {
      title: 'meroo.landing',
      description:
        'The page you are on. React + Vite, a live Discord card, a small glass design system, and about three more animations than it really needs.',
      tags: ['React', 'Vite', 'Lanyard'],
      url: 'https://github.com/neechko',
      accent: 'from-violet-500 via-fuchsia-500 to-pink-500',
      icon: 'layers',
    },
    {
      title: 'Presence card',
      description:
        'The Discord card pulled out of this page: status, custom status, open apps, Spotify progress, reconnect handling, and an offline state that does not pretend.',
      tags: ['WebSocket', 'REST', 'Tailwind'],
      url: 'https://github.com/neechko',
      accent: 'from-sky-400 via-cyan-400 to-emerald-400',
      icon: 'activity',
    },
    {
      title: 'GitHub',
      description:
        'Everything else ends up here. Experiments, half-finished ideas, and the occasional thing that actually works. The repo list is the honest changelog.',
      tags: ['code', 'notes', 'WIP'],
      url: 'https://github.com/neechko',
      accent: 'from-amber-400 via-orange-500 to-rose-500',
      icon: 'github',
    },
  ],

  // ── OFF THE CLOCK ─────────────────────────────────────────────────
  anime: {
    character: 'Castorice',
    source: 'Honkai: Star Rail',
    label: 'On the wallpaper',
  },
  offTheClock: {
    title: 'Not everything has to be a side project.',
    description:
      'Some nights I close the editor and do nothing productive. An episode, a game, the same playlist for the fourth time. That is the whole plan.',
    note: 'The wallpaper is Castorice. My sleep schedule is not.',
    tags: ['anime', 'gacha', 'lo-fi', 'late nights', 'bad aim'],
  },
}

export const discordProfileUrl = site.discordUserId
  ? `https://discord.com/users/${site.discordUserId}`
  : null
