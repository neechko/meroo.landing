import type { IncomingMessage, ServerResponse } from 'node:http'

export type QueryValue = string | string[] | undefined

/**
 * Vercel augments Node's request/response with a parsed query, a parsed body
 * and the `status`/`json` helpers. The local Vite adapter mirrors that shape,
 * so every route can share one typed contract instead of falling back to
 * `any` — and `npm run typecheck` catches mistakes before a deploy.
 */
export interface ApiRequest extends IncomingMessage {
  method?: string
  query?: Record<string, QueryValue>
  body?: unknown
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(payload: unknown): ApiResponse
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<unknown>
