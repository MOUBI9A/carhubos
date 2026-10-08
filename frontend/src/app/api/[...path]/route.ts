import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 25 * 1024 * 1024;

/** Same-origin forwarding; the backend destination is server configuration only. */
async function forward(request: NextRequest) {
  const configured = process.env.API_INTERNAL_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5406');
  if (!configured) return Response.json({ message: 'API service unavailable.' }, { status: 503 });
  let origin: URL;
  try {
    origin = new URL(configured);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error();
  } catch {
    return Response.json({ message: 'API service unavailable.' }, { status: 503 });
  }
  const target = new URL(origin.origin);
  target.pathname = request.nextUrl.pathname;
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'authorization', 'stripe-signature', 'origin']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: ArrayBuffer | undefined;
  if (!['GET', 'HEAD'].includes(request.method) && request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return Response.json({ message: 'Request body too large.' }, { status: 413 });
        }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = bytes.buffer;
  }
  try {
    const response = await fetch(target, {
      method: request.method, headers, body, redirect: 'manual', cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    const outgoing = new Headers();
    for (const name of ['content-type', 'content-disposition', 'location', 'www-authenticate', 'retry-after']) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    for (const cookie of response.headers.getSetCookie()) outgoing.append('set-cookie', cookie);
    outgoing.set('cache-control', 'no-store');
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ message: 'API service unavailable.' }, { status: 502 });
  }
}

export { forward as GET, forward as HEAD, forward as POST, forward as PUT, forward as PATCH, forward as DELETE, forward as OPTIONS };
