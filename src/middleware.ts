import { createClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  
  const { data: { session } } = await supabase.auth.getSession()

  // Logs para depuración
  console.log('Middleware - path:', request.nextUrl.pathname)
  console.log('Middleware - session:', session?.user?.id || 'NO SESSION')

  const protectedRoutes = ['/proyectos', '/gantt', '/indicadores', '/presupuesto', '/seguimiento']
  const authRoutes = ['/auth/login', '/auth/register']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  const isRootRoute = request.nextUrl.pathname === '/'

  if (isAuthRoute && session) {
    console.log('Middleware - REDIRECTING: Auth route with session -> dashboard')
    return NextResponse.redirect(new URL('/', request.url))
  }

  if ((isProtectedRoute || isRootRoute) && !session) {
    console.log('Middleware - REDIRECTING: Protected/root route without session -> login')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  console.log('Middleware - ALLOWING: Access granted')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
