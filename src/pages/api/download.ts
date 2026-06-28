import type { APIRoute } from 'astro';
import { list } from '@vercel/blob';
import { getProduct } from '../../config/products';
import { verifyDownloadToken } from '../../lib/download-token';
import { requireEnv } from '../../lib/env';

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
    const blobToken = requireEnv('BLOB_READ_WRITE_TOKEN');

    // Resolve the blob's URL by its pathname (we never store the full URL).
    const { blobs } = await list({
      prefix: file.blobKey,
      limit: 1,
      token: blobToken
    });
    const blob = blobs.find((b) => b.pathname === file.blobKey) ?? blobs[0];
    if (!blob) {
      return new Response('Archivo no disponible.', { status: 404 });
    }

    const upstream = await fetch(blob.downloadUrl ?? blob.url);
    if (!upstream.ok || !upstream.body) {
      return new Response('No se pudo obtener el archivo.', { status: 502 });
    }

    const headers = new Headers({
      'content-type': file.contentType,
      'content-disposition': `attachment; filename="${file.fileName}"`,
      'cache-control': 'private, no-store'
    });
    const length = upstream.headers.get('content-length');
    if (length) headers.set('content-length', length);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('[api/download] failed to stream file:', error);
    return new Response('Error al preparar la descarga.', { status: 500 });
  }
};
