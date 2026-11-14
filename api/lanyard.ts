/**
 * GET /api/lanyard?userId=712255301130125363
 *
 * Same-origin proxy for the public Lanyard REST API. Some browsers/networks
 * cannot resolve `api.lanyard.rest` (DNS, VPN, Secure DNS, ad-blockers) even
 * though the site itself loads fine. Routing the request through the deployment
 * makes presence work there too, and also gives us a place to cache briefly.
 *
 * The WebSocket still connects directly on the client; `useLanyard` falls back
 * to polling this endpoint when the socket cannot be established.
 */

import type { ApiRequest, ApiResponse } from './_types.ts'

const LANYARD_URL = 'https://api.lanyard.rest/v1/users'
const USER_ID = /^\d{17,20}$/

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=10')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed.' },
    })
  }

  const userId = String(req.query?.userId ?? '').trim()
  if (!USER_ID.test(userId)) {
    return res.status(400).json({
      success: false,
      error: { message: 'A valid Discord user id is required.' },
    })
  }

  try {
    const upstream = await fetch(`${LANYARD_URL}/${userId}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'meroo-landing/1.0 (https://github.com/neechko)',
      },
      signal: AbortSignal.timeout(9000),
    })

    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    )
    return res.end(body)
  } catch {
    return res.status(502).json({
      success: false,
      error: { message: 'Lanyard is unreachable right now.' },
    })
  }
}
