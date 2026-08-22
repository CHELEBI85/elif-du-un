import 'server-only'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { serverEnv } from './env'
import { log } from './logger'
import {
  AUTH_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  type AdminSession,
} from './session-token'

export type { AdminSession }
export { AUTH_COOKIE_NAME }

/**
 * Kullanıcı bulunamadığında da bcrypt çalıştırmak için kullanılan sahte özet.
 * Böylece "kullanıcı var mı" bilgisi yanıt süresinden sızmaz.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.HxHDtHXqYRD8UjD5MnFrPMbcJ7hSCPS'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** E-posta + şifre doğrular; başarılıysa oturum çerezini yazar. */
export async function signIn(email: string, password: string): Promise<AdminSession | null> {
  const normalized = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalized } })

  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !ok) {
    log.warn('auth', 'Başarısız giriş denemesi', { email: normalized })
    return null
  }

  const session: AdminSession = { userId: user.id, email: user.email }
  await writeSessionCookie(session)
  log.info('auth', 'Giriş başarılı', { userId: user.id })
  return session
}

export async function writeSessionCookie(session: AdminSession): Promise<void> {
  const token = await createSessionToken(session, serverEnv().AUTH_SECRET)
  const store = await cookies()
  store.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function signOut(): Promise<void> {
  const store = await cookies()
  store.delete(AUTH_COOKIE_NAME)
}

/** Geçerli oturumu döndürür; yoksa null. */
export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies()
  const token = store.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token, serverEnv().AUTH_SECRET)
}

/** Oturum zorunlu olan sunucu bileşenleri ve route handler'lar için. */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession()
  if (!session) throw new UnauthorizedError()
  return session
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Yetkisiz erişim')
    this.name = 'UnauthorizedError'
  }
}
