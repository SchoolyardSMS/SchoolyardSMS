import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  // Explicitly serve a clean robots.txt to bypass any unwanted injections
  if (request.nextUrl.pathname === '/robots.txt') {
    return new NextResponse(
      `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://schoolyard.qzz.io/sitemap.xml`,
      {
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    )
  }
}

export const config = {
  matcher: '/robots.txt',
}
