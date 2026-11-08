/**
 * POST /api/contact
 *
 * Sends a short message to a Discord channel through a webhook. The webhook
 * URL stays on the server: set DISCORD_WEBHOOK_URL in Vercel (or in `.env`
 * for local development) and never prefix it with VITE_.
 */

const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 5
const hits = new Map()

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

function limited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < RATE_WINDOW)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 500) {
    for (const [key, stamps] of hits) {
      if (!stamps.some((stamp) => now - stamp < RATE_WINDOW)) hits.delete(key)
    }
  }
  return recent.length > RATE_LIMIT
}

function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const webhook = (process.env.DISCORD_WEBHOOK_URL ?? '').trim()

  // Small preflight so the form can say "not connected yet" before someone
  // types a whole message. It only exposes whether a webhook exists.
  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(webhook),
      provider: 'discord-webhook',
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  if (!webhook) {
    return res.status(503).json({
      error: 'The contact form is not connected yet. Add DISCORD_WEBHOOK_URL on the server, or send a Discord DM instead.',
    })
  }

  if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(webhook)) {
    return res.status(500).json({ error: 'DISCORD_WEBHOOK_URL does not look like a Discord webhook.' })
  }

  const body = req.body ?? {}
  if (clean(body.website, 80)) {
    // Honeypot filled by a bot: pretend everything worked.
    return res.status(200).json({ ok: true })
  }

  if (limited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many messages in a short time. Try again in a few minutes.' })
  }

  const name = clean(body.name, 60)
  const contact = clean(body.contact, 120)
  const message = clean(body.message, 1000)

  if (name.length < 2) return res.status(400).json({ error: 'Please add a name.' })
  if (message.length < 5) return res.status(400).json({ error: 'Please write a slightly longer message.' })

  const fields = [
    { name: 'Name', value: name, inline: true },
    ...(contact ? [{ name: 'Contact', value: contact, inline: true }] : []),
    { name: 'Message', value: message, inline: false },
  ]

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'meroo.landing',
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: 'New message from the landing page',
            color: 0x8b5cf6,
            fields,
            footer: { text: 'meroo.landing · contact form' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'Discord rejected the message. Try a DM instead.' })
    }

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(502).json({ error: 'Could not reach Discord. Try a DM instead.' })
  }
}
