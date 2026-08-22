import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/session-token'

/**
 * Edge calisma zamaninda oldugumuz icin burada yalnizca jose kullanilir;
 * Edge calisma zamaninda oldugumuz icin burada yalnizca `jose` kullanilir;
 * veritabanı ve bcrypt bu katmana hiç girmez.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Giriş sayfası herkese açık olmalı, aksi hâlde yönlendirme döngüsü olur.
  if (pathname === '/admin/login') return NextResponse.next()

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    // Yapılandırma eksikse hiçbir koşulda paneli açmıyoruz.
    return NextResponse.redirect(new URL('/admin/login?error=config', request.url))
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token, secret) : null

  if (!session) {
    const loginUrl = new URL('/admin/login', request.url)
    if (pathname !== '/admin') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
