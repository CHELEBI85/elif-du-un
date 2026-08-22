/**
 * Çok hafif sunucu tarafı log yardımcısı.
 * Kural: hiçbir zaman sır (API secret, şifre, token) loglanmaz.
 */
type Level = 'info' | 'warn' | 'error'

const REDACT = /(secret|password|passwordhash|token|signature|api_key|apikey|authorization)/i

function scrub(meta: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (REDACT.test(key)) {
      safe[key] = '[redacted]'
    } else if (value instanceof Error) {
      safe[key] = value.message
    } else {
      safe[key] = value
    }
  }
  return safe
}

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  const line = {
    level,
    scope,
    message,
    at: new Date().toISOString(),
    ...(meta ? scrub(meta) : {}),
  }
  const serialized = JSON.stringify(line)
  if (level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.log(serialized)
}

export const log = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    emit('error', scope, message, meta),
}
