import type { APIRoute } from 'astro';
import { get, head } from '@vercel/blob';
import { getProduct } from '../../config/products';
import { verifyDownloadToken } from '../../lib/download-token';
import { getEnv } from '../../lib/env';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * GET /api/download?token=...&file=<id>
 *
 * Validates a signed download token and streams the requested file from Vercel
 * Blob. The Blob path is never exposed: blobs are public-but-unguessable, and
 * we proxy the bytes so the permanent URL stays hidden and the token's expiry
 * is enforced on every access. If `file` is omitted, the first file (the main
 * ebook) is served.
 */
export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token');
  const fileId = url.searchParams.get('file');

  if (!token) {
    return new Response('Falta el token de descarga.', { status: 400 });
  }

  const claims = await verifyDownloadToken(token).catch(() => null);
  if (!claims) {
    return new Response('Enlace de descarga inválido o expirado.', { status: 403 });
  }

  const product = getProduct(claims.slug);
  if (!product) {
    return new Response('Producto no encontrado.', { status: 404 });
  }

  const file = fileId
    ? product.files.find((f) => f.id === fileId)
    : product.files[0];
  if (!file) {
    return new Response('Archivo no encontrado.', { status: 404 });
  }

  try {
    // Authenticate the private-blob read. The store is provisioned in OIDC mode
    // (BLOB_STORE_ID + the VERCEL_OIDC_TOKEN that Vercel auto-injects into the
    // function runtime), so we let the SDK resolve those by default. If a
    // BLOB_READ_WRITE_TOKEN is explicitly set (e.g. local dev), prefer it.
    const blobToken = getEnv('BLOB_READ_WRITE_TOKEN');

    // Fetch the private blob by pathname. `get` returns a stream, so the
    // permanent Blob URL is never exposed and the store can stay private. (A 304
    // only happens with ifNoneMatch, which we don't send, so `stream` is always
    // present on success.)
    const result = await get(file.blobKey, {
      access: 'private',
      ...(blobToken ? { token: blobToken } : {})
    });
    if (!result || !result.stream) {
      return new Response('Archivo no disponible.', { status: 404 });
    }

    const headers = new Headers({
      'content-type': file.contentType,
      'content-disposition': `attachment; filename="${file.fileName}"`,
      'cache-control': 'private, no-store'
    });

    // `get` can report `blob.size === 0` for some objects (observed with .azw3 /
    // application/octet-stream) even though the stream carries the full file.
    // Setting `content-length: 0` truncates the download to 0 bytes, so fall back
    // to head()'s authoritative size and NEVER send a zero length for a real file.
    let size = result.blob.size;
    if (!size) {
      size = await head(file.blobKey, {
        ...(blobToken ? { token: blobToken } : {})
      })
        .then((h) => h.size)
        .catch(() => undefined);
    }
    if (size) {
      headers.set('content-length', String(size));
    }

    return new Response(result.stream, { status: 200, headers });
  } catch (error) {
    console.error('[api/download] failed to stream file:', error);
    return new Response('Error al preparar la descarga.', { status: 500 });
  }
};
