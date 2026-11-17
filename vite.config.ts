import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import contact from './api/contact.ts'
import lanyard from './api/lanyard.ts'
import mal from './api/mal.ts'
import views from './api/views.ts'
import appIcon from './api/app-icon.ts'
import type { ApiHandler, ApiRequest, ApiResponse } from './api/_types.ts'

const API_ROUTES: Record<string, ApiHandler> = {
  '/api/contact': contact,
  '/api/lanyard': lanyard,
  '/api/mal': mal,
  '/api/views': views,
  '/api/app-icon': appIcon,
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = ''
    let settled = false
    const done = (value: unknown) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    req.on('data', (chunk: Buffer) => {
      raw += chunk
      if (raw.length > 200_000) {
        req.destroy()
        done({})
      }
    })
    req.on('end', () => {
      try {
        done(raw ? JSON.parse(raw) : {})
      } catch {
        done({})
      }
    })
    req.on('error', () => done({}))
    req.on('close', () => done({}))
  })
}

/**
 * Vercel runs the files in `api/` as serverless functions. This small adapter
 * gives the same handlers a home under `npm run dev`, so the contact form and
 * the MyAnimeList panel work locally without installing the Vercel CLI.
 */
function localApi(env: Record<string, string>): Plugin {
  return {
    name: 'meroo-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const handler = API_ROUTES[url.pathname]
        if (!handler) return next()

        for (const key of ['DISCORD_WEBHOOK_URL', 'MAL_USERNAME', 'VIEWS_NAMESPACE', 'VIEWS_KEY']) {
          if (!process.env[key] && env[key]) process.env[key] = env[key]
        }

        const apiReq = req as ApiRequest
        apiReq.query = Object.fromEntries(url.searchParams)
        if (req.method === 'POST') apiReq.body = await readJson(req)

        const apiRes: ApiResponse = Object.assign(res, {
          status(code: number) {
            apiRes.statusCode = code
            return apiRes
          },
          json(payload: unknown) {
            apiRes.setHeader('Content-Type', 'application/json; charset=utf-8')
            apiRes.end(JSON.stringify(payload))
            return apiRes
          },
        })

        try {
          await handler(apiReq, apiRes)
        } catch {
          if (!apiRes.writableEnded) apiRes.status(500).json({ error: 'Local API crashed.' })
        }
      })
    },
  }
}

/**
 * YouTube refuses to play embeds when the page origin is an IP literal:
 * `http://127.0.0.1:5173` returns error 150 for every video, while the same
 * video plays from `http://localhost:5173` and from the deployed domain.
 * Sending loopback visitors to the `localhost` name keeps local testing honest.
 */
function loopbackRedirect(): Plugin {
  return {
    name: 'meroo-loopback-redirect',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()

        const host = req.headers.host ?? ''
        const loopback = /^127\.0\.0\.1(:\d+)?$/.test(host) || /^\[::1\](:\d+)?$/.test(host)
        if (!loopback) return next()

        let port = ''
        try {
          port = new URL(`http://${host}`).port
        } catch {
          // Keep the default port when the header is malformed.
        }

        res.statusCode = 302
        res.setHeader('Location', `http://localhost${port ? `:${port}` : ''}${req.url ?? '/'}`)
        res.end()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [loopbackRedirect(), react(), tailwindcss(), localApi(env)],
  }
})
