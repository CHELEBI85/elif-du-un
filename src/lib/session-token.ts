import { SignJWT, jwtVerify } from 'jose'

/**
 * Yalnızca `jose` kullanan oturum belirteci yardımcıları.
 * Bu dosya Edge middleware'den de import edilebilir; bu yüzden Prisma,
 * bcrypt gibi Node'a özgü bağımlılıklar buraya girmemelidir.
 */
export const AUTH_COOKIE_NAME = 'wedding_admin_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 saat
const ISSUER = 'elif-yunus-emre-dugun'

export interface AdminSession {
  userId: string
  username: string
}

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(session: AdminSession, secret: string): Promise<string> {
  return new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey(secret))
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), { issuer: ISSUER })
    if (!payload.sub || typeof payload.username !== 'string') return null
    return { userId: payload.sub, username: payload.username }
  } catch {
    return null
  }
}
