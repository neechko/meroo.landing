# meroo__ · enter

A single-screen personal hub. No scrolling: you click **Enter**, the intro warps away, and the HUD shows live Discord activity, GitHub projects, the MyAnimeList watching list, and a contact channel that actually sends a message.

Built with **Vite + React + Tailwind CSS**, animated with **Framer Motion**, presence by **[Lanyard](https://lanyard.rest)**, deployed on **Vercel**.

---

## What is on the screen

- **Intro gate** — a full-screen “enter” moment with a slow image pan and a warp transition. The click also counts as a user gesture, so music embeds can play later.
- **Profile panel** — avatar, Discord status, short bio, skills, and links to GitHub, Discord, MyAnimeList, and the website.
- **Live signal** — realtime Discord presence over WebSocket, custom status, open apps, active devices, and now playing.
- **Things I've built** — public repositories pulled from the GitHub API at runtime, with curated notes and a 10-minute session cache.
- **Now watching** — the public MyAnimeList “watching” list through a small serverless proxy, refreshed every five minutes or on demand.
- **Music player** — Discord only shares metadata. Spotify tracks open in a Spotify embed, YouTube Music links open in a YouTube embed, and anything else falls back to the original link.
- **Contact** — a real form that posts to `/api/contact` and forwards the message to a Discord webhook.
- **No page scroll** — the whole experience is `100dvh`. Desktop uses a three-column HUD; phones get four bottom tabs (Activity, GitHub, Anime, Profile) with internal panel scrolling only.
- **Mouse effects** — custom dot + lagging ring + comet trail + click ripple, plus a particle constellation and a soft pointer glow in the background.

All interface copy is in English.

---

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

```bash
npm run build     # typecheck the API, then build the bundle
npm run preview   # preview the bundle
npm run typecheck # tsc --noEmit for api/*.ts
npm run lint      # oxlint
```

The backend routes in `api/` are written in TypeScript. `vite.config.js` includes a tiny adapter that runs `api/contact.ts` and `api/mal.ts` (plus the other routes) during `npm run dev`, so the form and the anime list work locally without the Vercel CLI.

---

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
Copy-Item .env.example .env.local
```

| Variable | Required | Where | Description |
| --- | --- | --- | --- |
| `VITE_DISCORD_USER_ID` | For live presence | Client | Your Discord user ID. Leave empty for the honest offline state. |
| `VITE_DEMO_FALLBACK` | No | Client | Local development only. `false` disables preview presence data. |
| `DISCORD_WEBHOOK_URL` | For contact | **Server only** | Discord webhook used by `/api/contact`. Never prefix with `VITE_`. |
| `MAL_USERNAME` | No | Server | Overrides the MyAnimeList username from `src/config.js`. |

Only `VITE_` values are bundled into the browser. Keep the webhook URL on the server.

---

## Connect Discord (Lanyard)

1. Join the Lanyard server: <https://discord.gg/lanyard>. Lanyard can only read presence from members of that server.
2. In Discord, open **Settings → Advanced** and enable **Developer Mode**.
3. Right-click your profile → **Copy User ID**.
4. Add it to `.env.local`:

```env
VITE_DISCORD_USER_ID=123456789012345678
```

5. Restart `npm run dev`.

If the ID is set but the panel stays offline, check that you joined the Lanyard server, the ID is correct, and Lanyard is not having an outage.

### Preview data

In development, when no ID is configured or Lanyard cannot be reached, the HUD shows clearly labelled preview data. Production builds always show real data or an honest offline state. To disable the preview locally:

```env
VITE_DEMO_FALLBACK=false
```

---

## GitHub sync

`src/lib/github.js` fetches:

```text
https://api.github.com/users/neechko/repos?per_page=100&sort=pushed
```

- No token is needed for public repositories.
- Forks, archived repositories, and the profile README repo are filtered out.
- `site.github.featured` decides the first cards; the rest follow by latest push.
- Results are cached in `sessionStorage` for 10 minutes. The refresh button bypasses the cache.
- If GitHub is unreachable or rate-limited, the curated `site.projects` list is shown instead.

Edit the username, limit, and featured order in **`src/config.js`**. Hand-written descriptions live in `site.projectNotes`.

> The public GitHub API allows 60 requests per hour per IP. The cache keeps a normal visit to one request.

---

## MyAnimeList sync

MyAnimeList does not send CORS headers on its list endpoint, so the browser cannot read it directly. `api/mal.ts` fetches:

```text
https://myanimelist.net/animelist/meroo__/load.json?offset=0&status=1
```

and returns a small normalized list. The client refreshes it every five minutes while the tab is visible, and there is a manual refresh button.

- The list must be **public**.
- The username is `site.myanimelist.username` in `src/config.js`, or `MAL_USERNAME` on the server.
- Covers are served from `cdn.myanimelist.net`.

---

## Make the contact form work

The old contact area was decorative. This one posts to a serverless function, but it needs a destination. A Discord webhook is the simplest option and needs no database.

1. Open Discord → **Server Settings → Integrations → Webhooks → New Webhook**.
2. Pick a channel and copy the webhook URL.
3. Add it to Vercel (and to `.env.local` for local testing):

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

4. Redeploy on Vercel. Server environment variables are read at runtime, so a redeploy is the reliable way to pick them up.

Without this variable, the form returns a clear `503` message and offers a Discord DM link instead. It never pretends a message was sent.

The endpoint validates length, strips control characters, ignores a honeypot field, rate-limits to five messages per ten minutes per IP, and disables mention parsing so a message cannot ping `@everyone`.

---

## Music playback

Discord (and therefore Lanyard) exposes track metadata, **not audio**. There is no official way to stream someone's Discord audio from a website.

The HUD handles it honestly:

| Source | What “Play here” does |
| --- | --- |
| Spotify | Opens the Spotify track embed. |
| YouTube Music | Converts the activity's `details_url` into a YouTube embed. |
| Anything else | Shows the original link when one is available. |

Playback still depends on the track being embeddable and available in the visitor's region. If the provider blocks the embed, use the **Open** link.

### Album art

Discord external activity assets look like:

```text
mp:external/<hash>/https/<host>/<path>
```

They must be served through `https://media.discordapp.net/external/<hash>/https/<host>/<path>`. Omitting `/external/` returns `401`. `activityImage()` in `src/lib/format.js` handles this, which is why YouTube Music covers now appear.

---

## Customize

Most content lives in **`src/config.js`**:

| Field | What it changes |
| --- | --- |
| `name`, `displayName` | Branding in the intro, header, and profile |
| `role`, `hero`, `bio`, `skills` | Persona copy and chips |
| `socials` | GitHub and website links |
| `github` | Username, card limit, featured order |
| `projectNotes` | Hand-written descriptions, tags, accents |
| `projects` | Fallback cards when the GitHub API fails |
| `myanimelist` | Username and list size |
| `contact` | Form endpoint |
| `location`, `timezone` | Local clock |

HUD surfaces, brackets, scanlines, intro animation, and panel entrance keyframes live in **`src/index.css`**.

### Images

| File | Used for |
| --- | --- |
| `profile.jpg` | Avatar fallback and Open Graph image |
| `castorice-hero.jpg` | Intro background |
| `castorice-side.jpg` | Profile card banner |
| `castorice5.jpg` | Small accent artwork |
| `demo-cover.svg` | Local preview album art |

The Castorice artwork is fan-art usage. Check the original artist's terms before redistributing it.

---

## Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel: **Add New → Project** → import the repository.
3. Confirm:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables:
   - `VITE_DISCORD_USER_ID`
   - `DISCORD_WEBHOOK_URL` (server-side)
   - Optional: `MAL_USERNAME`
5. Deploy.

`vercel.json` pins the framework, build command, and output directory. The files in `api/` become serverless functions automatically; Vercel compiles the TypeScript routes on deploy, and `npm run build` typechecks them first.

Any later push to `main` triggers a new deployment. `VITE_` values are read at build time, so redeploy after changing them.

---

## Project structure

```text
api/                          # TypeScript serverless routes (see tsconfig.json)
├─ _types.ts                  # shared ApiRequest / ApiResponse contract
├─ contact.ts                 # POST /api/contact → Discord webhook
├─ lanyard.ts                 # GET /api/lanyard → same-origin presence proxy
├─ mal.ts                     # GET /api/mal → normalized watching list
├─ views.ts                   # GET /api/views → live view counter
└─ app-icon.ts                # GET /api/app-icon → Discord game icons

src/
├─ config.js                  # persona, links, GitHub/MAL/contact settings
├─ App.jsx                    # intro + HUD composition
├─ index.css                  # theme, HUD chrome, intro/keyframes
├─ components/
│  ├─ Intro.jsx               # enter gate
│  ├─ Hud.jsx                 # HUD shell, data hooks, mobile tabs
│  ├─ HudPanel.jsx            # shared panel chrome + header
│  ├─ ProfilePanel.jsx
│  ├─ ActivityPanel.jsx       # presence + now playing
│  ├─ GithubPanel.jsx         # synced repositories
│  ├─ AnimePanel.jsx          # MyAnimeList watching
│  ├─ ContactModal.jsx        # real contact form
│  ├─ MusicPlayer.jsx         # Spotify / YouTube embed
│  ├─ Background.jsx          # aurora, particles, pointer glow
│  ├─ Cursor.jsx              # dot, ring, trail, ripple
│  ├─ presence-parts.jsx      # album art, activity rows, status
│  ├─ ui.jsx                  # shared bits
│  └─ icons.jsx               # Discord, Spotify, GitHub icons
└─ lib/
   ├─ lanyard.js              # REST snapshot + WebSocket
   ├─ github.js               # public repo hook + cache
   ├─ mal.js                  # anime list hook
   ├─ nowPlaying.js           # unified Spotify / YouTube Music metadata
   ├─ format.js               # status, avatar, time, activity helpers
   ├─ demoPresence.js         # local preview presence
   └─ hooks.js                # timers, typewriter, active section
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
- Avatars and activity assets come from the Discord CDN. Album art for YouTube Music is an external asset proxied through `media.discordapp.net/external/`.
- Presence is public data for whatever you choose to display on your Discord profile. Keep webhooks and tokens out of the frontend.
