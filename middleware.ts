import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

const protectedRoutes = ['/dashboard', '/buat-pengaduan', '/aspirasi', '/riwayat-aspirasi', '/stats', '/chat', '/laporan-dosen'];
const adminRoutes = ['/admin'];
const publicOnlyRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude static files and api routes from main middleware logic
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  let session = null;
  
  if (token) {
    session = await verifyJWT(token);
  }

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/admin');
  const isAdmin = pathname.startsWith('/admin');
  const isPublicOnly = publicOnlyRoutes.some(route => pathname.startsWith(route));

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAdmin && session?.role !== 'admin' && session?.role !== 'staff') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublicOnly && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
