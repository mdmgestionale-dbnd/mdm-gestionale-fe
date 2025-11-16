import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const url = request.nextUrl.clone();

  const isPrivate = url.pathname.startsWith('/private');
  const isRoot = url.pathname === '/' || url.pathname === '';
  const isLanding = url.pathname.startsWith('/landing');
  const isAuth = url.pathname.startsWith('/authentication');

  // 🔹 Se l’utente è già autenticato e prova ad andare su /authentication → redireziona alla home
  if (isAuth && request.cookies.get('token')?.value) {
    try {
      await jwtVerify(
        request.cookies.get('token')!.value,
        new TextEncoder().encode(process.env.JWT_SECRET as string)
      );
      return NextResponse.redirect(new URL('/', request.url));
    } catch (_) {
      // se il token non è valido, prosegui normalmente
    }
  }


  // Accesso libero a landing e autenticazione
  if (isLanding || isAuth) return NextResponse.next();

  // Nessun token
  if (!token) {
    if (isPrivate || isRoot) {
      return NextResponse.redirect(new URL('/authentication/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET as string)
    );

    // Estrai e normalizza ruolo
    const ruoloRaw =
      (payload as Record<string, any>)?.role ||
      (payload as Record<string, any>)?.ruolo;
    const ruolo = typeof ruoloRaw === 'string' ? ruoloRaw.toUpperCase() : '';

    // Routing in base al ruolo
    if (isRoot) {
      if (ruolo === 'ADMIN') {
        return NextResponse.redirect(new URL('/private/admin/assegnazioni', request.url));
      }
      if (ruolo === 'SUPERVISORE') {
        return NextResponse.redirect(new URL('/private/admin/assegnazioni', request.url));
      }
      if (ruolo === 'DIPENDENTE') {
        return NextResponse.redirect(new URL('/private/admin/assegnazioni', request.url));
      }
    }

    // Se è un utente con ruolo valido → può navigare
    if (['ADMIN', 'SUPERVISORE', 'DIPENDENTE'].includes(ruolo)) {
      return NextResponse.next();
    }

    // Ruolo non riconosciuto → logout forzato
    return NextResponse.redirect(new URL('/authentication/login', request.url));
  } catch (err) {
    console.error('Errore verifica token:', err);
    return NextResponse.redirect(new URL('/authentication/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|authentication|landing|api/public|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|pdf)).*)',
  ],
};
