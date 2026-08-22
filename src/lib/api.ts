import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { UnauthorizedError } from './auth'
import { log } from './logger'
import { messages } from './messages'

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'EVENT_EXPIRED'
  | 'SESSION_LIMIT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, code, ...extra }, { status })
}

export function badRequest(message: string = messages.errors.server) {
  return jsonError('BAD_REQUEST', message, 400)
}

export function unauthorized() {
  return jsonError('UNAUTHORIZED', 'Bu işlem için giriş yapmalısınız.', 401)
}

export function notFound(message: string = messages.errors.notFound) {
  return jsonError('NOT_FOUND', message, 404)
}

export function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: messages.errors.rateLimited, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

export function serverError() {
  return jsonError('SERVER_ERROR', messages.errors.server, 500)
}

/**
 * Route handler'ları saran ortak hata yakalayıcı.
 * Teknik ayrıntılar loglanır, istemciye yalnızca nazik bir mesaj döner.
 */
export function withErrorHandling<Args extends unknown[]>(
  scope: string,
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof UnauthorizedError) return unauthorized()
      if (error instanceof ZodError) return badRequest()
      log.error(scope, 'İşlenmemiş hata', {
        error: error instanceof Error ? error.message : 'bilinmeyen hata',
      })
      return serverError()
    }
  }
}
