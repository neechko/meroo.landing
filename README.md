# meroo__

Personal landing page with a live Discord presence card. Status, custom status, open apps, and whatever I'm listening to on Spotify show up without a refresh.

Built with **Vite + React + Tailwind CSS**, animated with **Framer Motion**, presence by **[Lanyard](https://lanyard.rest)**. Deployed on **Vercel**.

---

## Stack

- React 19 + Vite
- Tailwind CSS v4
- Framer Motion
- Lanyard REST + WebSocket
- Space Grotesk / Inter

## Features

- Live Discord presence over WebSocket, with a REST snapshot on load.
- Status, custom status with emoji, active devices, and open applications.
- Spotify now playing with artwork, artist, album, and a running progress bar.
- A dedicated presence dashboard plus a compact card in the hero.
- Castorice artwork from *Honkai: Star Rail* in the hero card and the "Off the clock" section.
- Responsive layout, mobile menu, reduced-motion support, and keyboard focus states.
- Honest offline state. Production never shows fake presence data.

---

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you need:

```bash
Copy-Item .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_DISCORD_USER_ID` | For live presence | Your Discord user ID. Leave empty to show the offline state. |
| `VITE_DEMO_FALLBACK` | No | Local development only. Set to `false` to disable preview data. |

These values are bundled into the client, so only put public information here. Never put a Discord bot token in a `VITE_` variable.

---

## Connect Discord (Lanyard)

1. Join the Lanyard server: <https://discord.gg/lanyard>. Lanyard can only read presence from members of that server.
2. In Discord, open **Settings → Advanced** and enable **Developer Mode**.
3. Right-click your profile and choose **Copy User ID**.
4. Add the ID to `.env.local`:

```env
VITE_DISCORD_USER_ID=123456789012345678
```

5. Restart `npm run dev`.

If the ID is set but the card stays offline, check that you joined the Lanyard server, the ID is correct, and Lanyard is not having an outage.

### Preview data

In development, when no ID is configured or Lanyard cannot be reached, the site shows clearly labelled preview data so the layout still looks alive. This fallback is disabled automatically in production builds (`import.meta.env.DEV`).

To see the offline state locally, set:

```env
VITE_DEMO_FALLBACK=false
```

---

## Customize

Most content lives in **`src/config.js`**:

| Field | What it changes |
| --- | --- |
| `name`, `displayName` | Name in the nav, hero, footer |
| `role`, `roles` | Static role and rotating hero roles |
| `tagline`, `bio` | Hero and About copy |
| `skills` | Skill groups in the About section |
| `projects` | Project cards (title, description, tags, URL, accent, icon) |
| `socials` | Social links. Currently GitHub only |
| `email` | Email button. Leave empty to hide it |
| `location`, `timezone` | Hero stats and local clock |
| `anime`, `offTheClock` | "Off the clock" copy and artwork labels |

Design tokens, glass surfaces, aurora, and keyframes are in **`src/index.css`**.

### Images

All local images live in `public/`:

| File | Used for |
| --- | --- |
| `profile.jpg` | Avatar fallback and Open Graph image |
| `castorice-hero.jpg` | Presence card banner and Off the Clock portrait |
| `castorice-side.jpg` | Offset portrait beside the hero card on wide screens |
| `castorice5.jpg` | Small inset image and floating chip |

The Castorice artwork is fan-art usage. Check the original artist's terms before redistributing it.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/neechko/meroo-landing.git
git push -u origin main
```

`.env.local`, `node_modules`, `dist`, and `.vercel` are ignored, so no secrets or build output end up in the repo. `.env.example` is tracked on purpose.

---

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel detects Vite automatically. Confirm:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add the environment variable:
   - Key: `VITE_DISCORD_USER_ID`
   - Value: your Discord user ID
   - Environments: Production (add it to Preview too if you want)
5. Deploy.

Any later push to `main` triggers a new deployment. Environment variables are read at build time, so redeploy after changing `VITE_DISCORD_USER_ID`.

Social previews use `og:image` in `index.html`. It is set to `/profile.jpg` so it works without hardcoding a domain. If you want a guaranteed preview on every platform, change it to the absolute URL of your deployment, for example `https://your-project.vercel.app/profile.jpg`.

---

## Project structure

```
src/
├─ config.js                 # content, links, Discord config
├─ App.jsx                   # page composition
├─ index.css                 # theme, glass surfaces, animations
├─ components/
│  ├─ Background.jsx         # aurora, particles, cursor glow
│  ├─ Navbar.jsx             # nav, scroll progress, mobile menu
│  ├─ Hero.jsx               # hero, typing effect, stats
│  ├─ PresenceCard.jsx       # compact Discord card in the hero
│  ├─ LiveNow.jsx            # real-time presence dashboard
│  ├─ About.jsx              # bio, terminal, skills, marquee
│  ├─ OffTheClock.jsx        # anime / off-duty section
│  ├─ Projects.jsx           # project cards
│  ├─ Connect.jsx            # Discord CTA, copy username, chat preview
│  ├─ Footer.jsx
│  ├─ presence-parts.jsx     # shared presence components
│  ├─ ui.jsx                 # Reveal, headings, buttons, badges
│  └─ icons.jsx              # Discord, Spotify, GitHub icons
└─ lib/
   ├─ lanyard.js             # REST + WebSocket hook
   ├─ demoPresence.js        # local preview data
   ├─ format.js              # status, avatar, time helpers
   └─ hooks.js               # timers, typewriter, active section
```

---

## Notes

- Lanyard REST: `GET https://api.lanyard.rest/v1/users/:id`
- Lanyard WebSocket: `wss://api.lanyard.rest/socket`
  - `op 1`: hello + heartbeat interval
  - `op 2`: subscribe to a user ID
  - `op 0` with `INIT_STATE` / `PRESENCE_UPDATE`: presence payload
- The socket reconnects with exponential backoff.
- Spotify progress is calculated from `timestamps.start` and `timestamps.end`.
- Avatars and app assets come from the Discord CDN. Album art comes from Spotify.
- No backend, API keys, or database. Everything runs in the browser.

Discord presence is public data for whatever you choose to display on your profile. Keep tokens out of the frontend.
