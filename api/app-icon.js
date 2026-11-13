/**
 * GET /api/app-icon?ids=762434991303950386,1121201675240210523
 *
 * Resolves Discord application IDs to their icon URLs. Rich Presence artwork
 * is already embedded in the Lanyard payload, but games detected by the
 * Discord client (Genshin, HSR, most launchers) often carry no assets at all.
 * Discord's public detectable-applications list has the icon hashes; it is
 * about 13 MB, so it is fetched here once, cached in memory, and trimmed to
 * the requested IDs before it reaches the browser.
 */

const DETECTABLE = 'https://discord.com/api/v10/applications/detectable'
const CACHE_MS = 6 * 60 * 60 * 1000
const MAX_IDS = 12

// A small built-in map so the common cases answer instantly, even on a cold
// function or when Discord's list endpoint is unavailable.
const KNOWN = {
  '762434991303950386': '0a7cc00267310bf4afdd78b175a7aeea', // Genshin Impact
  '1121201675240210523': '444d067889922e42b0af99b13e5d5c72', // Honkai: Star Rail
  '1124351937098301590': 'eb88c509a5ab7dc61085e95df1716a99', // Honkai Impact 3rd
  '1257819671114289184': 'fb528a20677f93d8f365fac88e3f0713', // Zenless Zone Zero
  '1247227126416146462': '1e7d7e9ca69ea0951467994c581f70f5', // Wuthering Waves
  '700136079562375258': '11f81959f4fdd76ca6c39c59eac256c1', // VALORANT
  '1402418696126992445': '7c99428541032ac02ec6981d88b78fb7', // League of Legends
  '1158877933042143272': '558f5a26ecb3b17c3dea3d15c1df537a', // Counter-Strike 2
  '1402418491272986635': '166fbad351ecdd02d11a3b464748f66b', // Minecraft
  '356875988589740042': '6b4b3fa4c83555d3008de69d33a60588', // Dota 2
  '542075586886107149': '91fac0600c5b6527c1aea95a93c6a8e0', // Apex Legends
  '1402418703554842694': 'c1864b38910c209afd5bf6423b672022', // Fortnite
  '1402418717781921935': '9d616d0c960ff87c3bc6beb9475362f5', // PUBG
  '1402418436809953330': '28c674e1de18e7a100a44559d64a55b8', // ELDEN RING
  '787443973538971748': '023b9ec72cd60e31e25bca878c77984a', // Cyberpunk 2077
  '363445589247131668': 'f2b60e350a2097289b3b0b877495e55f', // ROBLOX
  '1402418239342120960': 'ea86f6c52576847a7cb81f1c1faa18a3', // osu!
  '1402418648332898466': '86479a5f873535f5b432c738a0bb400c', // Red Dead Redemption 2
  '359509387670192128': '1e84012079d438b46bbb3c3bf2a409bb', // Stardew Valley
  '1402418344912752671': '4c3c185abc0dfb4cb1ec5612de4d7366', // Terraria
  '356877880938070016': 'a74899a5190c48a3e6ce9f8d2eaff348', // Rocket League
}

let cache = { map: null, at: 0 }

function iconUrl(applicationId, hash, size = 128) {
  return `https://cdn.discordapp.com/app-icons/${applicationId}/${hash}.png?size=${size}`
}

async function loadDetectable() {
  if (cache.map && Date.now() - cache.at < CACHE_MS) return cache.map

  const response = await fetch(DETECTABLE, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}`)

  const list = await response.json()
  if (!Array.isArray(list)) throw new Error('Unexpected detectable list')

  const map = new Map()
  for (const app of list) {
    if (app?.id && app?.icon_hash) map.set(String(app.id), app.icon_hash)
  }

  cache = { map, at: Date.now() }
  return map
}

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const ids = String(req.query?.ids ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d{15,25}$/.test(id))
    .slice(0, MAX_IDS)

  if (!ids.length) return res.status(200).json({ icons: {} })

  const icons = {}
  ids.forEach((id) => {
    if (KNOWN[id]) icons[id] = iconUrl(id, KNOWN[id])
  })

  const missing = ids.filter((id) => !icons[id])
  if (missing.length) {
    try {
      const map = await loadDetectable()
      missing.forEach((id) => {
        const hash = map.get(id)
        if (hash) icons[id] = iconUrl(id, hash)
      })
    } catch {
      // The built-in map (or the Rich Presence artwork) still covers the row.
    }
  }

  return res.status(200).json({ icons })
}
