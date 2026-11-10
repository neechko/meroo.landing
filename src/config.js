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
  role: 'Code enthusiast',
  motto: 'still playing the game of life',
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
    website: 'https://meroo.my.id/',
  },

  // ── HERO / HUD ────────────────────────────────────────────────────
  hero: {
    subline: 'Discord bots, half-finished ideas, and a frontend I am still learning.',
    tagline:
      'Aspiring backend developer from Indonesia. I build Discord bots with Node.js, connect APIs, and break the frontend until it looks right.',
  },
  roles: ['Aspiring backend developer', 'Discord bot tinkerer', 'Code enthusiast', 'Still learning in public'],

  // ── ABOUT ─────────────────────────────────────────────────────────
  bio: [
    'I am a beginner who started this journey recently. Most of my time goes into Discord bots: Node.js, Gemini for the AI part, AniList and other APIs for everything else, SQLite to keep the state in place.',
    'Frontend is still a work in progress. This page is where I practice it. I am not a frontend developer; I just refused to leave it ugly.',
  ],
  skills: {
    Backend: ['Node.js', 'Discord.js', 'PHP', 'Laravel', 'MySQL', 'SQLite', 'REST APIs', 'Gemini API'],
    Frontend: ['HTML', 'CSS', 'JavaScript', 'React', 'Tailwind CSS'],
    Tools: ['Git', 'GitHub', 'Linux', 'PowerShell', 'Vercel', 'VS Code'],
  },

  // ── GITHUB ────────────────────────────────────────────────────────
  // The project list is fetched from the public GitHub API at runtime.
  // `featured` decides which repositories are shown first; everything else
  // follows by latest push. No token is needed for public repositories.
  github: {
    username: 'neechko',
    limit: 5,
    featured: ['mokachan', 'service.app', 'meroo.landing'],
  },

  // Hand-written notes override what GitHub returns. Repos without a note
  // use their GitHub description, or a neutral line when there is none.
  projectNotes: {
    mokachan: {
      description:
        'Discord bot with a Gemini-powered AI companion and an automatic anime character-claiming game. Memory lives in rolling summaries and SQLite tables.',
      tags: ['Node.js', 'Gemini', 'AniList', 'SQLite'],
      accent: 'from-violet-500 via-fuchsia-500 to-pink-500',
    },
    'service.app': {
      description:
        'TypeScript app with a live deployment at primoraapp.vercel.app. One of the projects I keep coming back to.',
      tags: ['TypeScript', 'Vercel'],
      accent: 'from-sky-400 via-cyan-400 to-emerald-400',
    },
    'meroo.landing': {
      description:
        'This single-screen HUD: live Discord presence, GitHub sync, MyAnimeList, and a contact channel that actually delivers.',
      tags: ['React', 'Vite', 'Lanyard'],
      accent: 'from-violet-500 via-indigo-500 to-cyan-400',
    },
    'meroo.my.id': {
      description: 'The old PHP home for meroo.my.id. Still public, still part of the journey.',
      tags: ['PHP', 'Web'],
      accent: 'from-slate-400 via-zinc-400 to-stone-300',
    },
    'gritinsight-page': {
      description: 'A small landing page experiment. No README yet, but the code is public.',
      tags: ['HTML', 'CSS'],
      accent: 'from-amber-400 via-orange-500 to-rose-500',
    },
  },

  // Shown when the GitHub API is unreachable or rate-limited.
  projects: [
    {
      title: 'mokachan',
      description:
        'Discord bot with a Gemini-powered AI companion and an automatic anime character-claiming game. Memory lives in rolling summaries and SQLite tables.',
      tags: ['Node.js', 'Gemini', 'AniList', 'SQLite'],
      url: 'https://github.com/neechko/mokachan',
      accent: 'from-violet-500 via-fuchsia-500 to-pink-500',
      icon: 'github',
    },
    {
      title: 'service.app',
      description: 'TypeScript app with a live deployment at primoraapp.vercel.app.',
      tags: ['TypeScript', 'Vercel'],
      url: 'https://github.com/neechko/service.app',
      accent: 'from-sky-400 via-cyan-400 to-emerald-400',
      icon: 'github',
    },
    {
      title: 'gritinsight-page',
      description: 'A small landing page experiment. No README yet, but the code is public.',
      tags: ['HTML', 'CSS'],
      url: 'https://github.com/neechko/gritinsight-page',
      accent: 'from-amber-400 via-orange-500 to-rose-500',
      icon: 'github',
    },
  ],

  // ── MYANIMELIST ───────────────────────────────────────────────────
  // Public list, read through /api/mal so the browser does not hit CORS.
  // The username below is only used for the profile link and the request.
  myanimelist: {
    username: 'meroo__',
    limit: 6,
  },

  // ── CONTACT ───────────────────────────────────────────────────────
  // The form posts to /api/contact, which forwards to a Discord webhook.
  // Set DISCORD_WEBHOOK_URL on Vercel (server-side only, no VITE_ prefix).
  contact: {
    endpoint: '/api/contact',
  },

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
    tags: ['anime', 'gacha', 'youtube music', 'late nights', 'bad aim'],
  },
}

export const discordProfileUrl = site.discordUserId
  ? `https://discord.com/users/${site.discordUserId}`
  : null
