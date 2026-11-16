import { NextResponse, type NextRequest } from "next/server";
import { NAMA_COOKIE } from "./server/kuki";

// Lapisan pertama: tanpa cookie sesi, semua halaman selain /login dialihkan dan API ditolak.
// Ini hanya pemeriksaan cepat (cookie ada atau tidak). Keabsahan sesi dan hak akses diperiksa ulang
// di server pada setiap API dan Server Action.

const PUBLIK = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIK.has(pathname) || request.cookies.has(NAMA_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ galat: "belum-masuk" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)"],
};
