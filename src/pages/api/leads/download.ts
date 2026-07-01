import type { APIRoute } from 'astro';
import { get, head } from '@vercel/blob';
import { getLeadMagnet } from '../../../config/lead-magnets';
import { verifyLeadMagnetToken } from '../../../lib/lead-magnet-token';
import { getEnv } from '../../../lib/env';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * GET /api/leads/download?token=...
 *
 * Validates a signed lead-magnet token and streams the free guide PDF from
 * Vercel Blob. Mirrors /api/download (the paid flow) but reads from the
 * lead-magnet catalog and its own signing secret, so the two never cross. The
 * Blob path is never exposed: we proxy the bytes so the permanent URL stays
 * hidden and the token's expiry is enforced on every access.
 */
export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Falta el token de descarga.', { status: 400 });
  }

  const claims = await verifyLeadMagnetToken(token).catch(() => null);
  if (!claims) {
    return new Response('Enlace de descarga inválido o expirado.', {
      status: 403
    });
  }

  const magnet = getLeadMagnet(claims.magnet);
  if (!magnet) {
    return new Response('Guía no encontrada.', { status: 404 });
  }

  const file = magnet.file;

  try {
    // Authenticate the private-blob read. In production the store is in OIDC
    // mode (the SDK resolves BLOB_STORE_ID + the injected VERCEL_OIDC_TOKEN);
    // locally a BLOB_READ_WRITE_TOKEN, if set, is preferred.
    const blobToken = getEnv('BLOB_READ_WRITE_TOKEN');

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

    // `get` can report `blob.size === 0` for some objects even though the
    // stream carries the full file; never send a zero length for a real file.
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
    console.error('[api/leads/download] failed to stream guide:', error);
    return new Response('Error al preparar la descarga.', { status: 500 });
  }
};
