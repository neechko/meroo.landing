import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import contact from './api/contact.js'
import mal from './api/mal.js'
import views from './api/views.js'

const API_ROUTES = {
  '/api/contact': contact,
  '/api/mal': mal,
  '/api/views': views,
}

function readJson(req) {
  return new Promise((resolve) => {
    let raw = ''
    let settled = false
    const done = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    req.on('data', (chunk) => {
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
function localApi(env) {
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

        req.query = Object.fromEntries(url.searchParams)
        if (req.method === 'POST') req.body = await readJson(req)

        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (payload) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(payload))
          return res
        }

        try {
          await handler(req, res)
        } catch {
          if (!res.writableEnded) res.status(500).json({ error: 'Local API crashed.' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), localApi(env)],
  }
})
