/**
 * Upload product deliverables to Vercel Blob.
 *
 * Reads the file list from src/config/products.ts and uploads each file to its
 * exact `blobKey`, with `addRandomSuffix: false` so the stored pathname matches
 * the key /api/download looks up.
 *
 * Local files are read from a source directory that MIRRORS the blob keys:
 *
 *   <source-dir>/books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.pdf
 *   <source-dir>/books/el-trader-que-perdia-ganando/es/hojas-de-referencia.pdf
 *   ...
 *
 * Usage:
 *   npm run upload-files                 # source dir: ./blob-uploads
 *   npm run upload-files -- --dir ./dist-books
 *   npm run upload-files -- --dry-run    # list what would happen, upload nothing
 *
 * Requires BLOB_READ_WRITE_TOKEN (loaded from .env via the npm script).
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { listProducts } from '../src/config/products.ts';
import { listLeadMagnets } from '../src/config/lead-magnets.ts';

/**
 * Products whose Blob objects may be overwritten on upload. Keep this tight:
 * a slug is added here only when we intentionally re-publish updated files for
 * it. Everything not listed keeps the default no-overwrite protection.
 */
const OVERWRITE_SLUGS = new Set<string>(['como-hacer-trading-desde-chile']);

/**
 * Lead-magnet slugs whose Blob objects may be overwritten. The free guide is
 * regenerated as its copy is tuned, so allow re-publishing it.
 */
const OVERWRITE_MAGNET_SLUGS = new Set<string>([
  'como-empezar-trading-desde-chile'
]);

interface Args {
  dir: string;
  dryRun: boolean;
  leadMagnetsOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  let dir = 'blob-uploads';
  let dryRun = false;
  let leadMagnetsOnly = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dir') dir = argv[++i] ?? dir;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--lead-magnets-only') leadMagnetsOnly = true;
  }
  return { dir: path.resolve(process.cwd(), dir), dryRun, leadMagnetsOnly };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const { dir, dryRun, leadMagnetsOnly } = parseArgs(process.argv.slice(2));

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token && !dryRun) {
    console.error(
      'Missing BLOB_READ_WRITE_TOKEN. Add it to .env or pass --dry-run.'
    );
    process.exit(1);
  }

  console.log(`Source directory: ${dir}`);
  console.log(dryRun ? 'Mode: dry run (no uploads)\n' : 'Mode: uploading\n');

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of leadMagnetsOnly ? [] : listProducts()) {
    console.log(`▸ ${product.title}`);
    for (const file of product.files) {
      const localPath = path.join(dir, file.blobKey);

      if (!(await exists(localPath))) {
        console.warn(`  ⚠ missing: ${path.relative(process.cwd(), localPath)}`);
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  • would upload ${file.blobKey} (${file.contentType})`);
        continue;
      }

      try {
        const body = await readFile(localPath);
        // Overwrite is scoped to a per-product allowlist so re-uploading an
        // updated product can replace its own Blob objects, while every other
        // product keeps the default no-overwrite guard that protects its
        // already-published files from being clobbered.
        const allowOverwrite = OVERWRITE_SLUGS.has(product.slug);
        const result = await put(file.blobKey, body, {
          access: 'private',
          addRandomSuffix: false,
          contentType: file.contentType,
          allowOverwrite,
          token
        });
        console.log(`  ✓ ${file.blobKey}`);
        console.log(`      ${result.url}`);
        uploaded++;
      } catch (error) {
        console.error(
          `  ✗ failed ${file.blobKey}: ${(error as Error).message}`
        );
        failed++;
      }
    }
  }

  // Lead magnets (free giveaway PDFs). Same source-dir-mirrors-blobKey rule as
  // products; each magnet has a single deliverable file.
  for (const magnet of listLeadMagnets()) {
    console.log(`▸ [lead magnet] ${magnet.title}`);
    const file = magnet.file;
    const localPath = path.join(dir, file.blobKey);

    if (!(await exists(localPath))) {
      console.warn(`  ⚠ missing: ${path.relative(process.cwd(), localPath)}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  • would upload ${file.blobKey} (${file.contentType})`);
      continue;
    }

    try {
      const body = await readFile(localPath);
      const result = await put(file.blobKey, body, {
        access: 'private',
        addRandomSuffix: false,
        contentType: file.contentType,
        allowOverwrite: OVERWRITE_MAGNET_SLUGS.has(magnet.slug),
        token
      });
      console.log(`  ✓ ${file.blobKey}`);
      console.log(`      ${result.url}`);
      uploaded++;
    } catch (error) {
      console.error(`  ✗ failed ${file.blobKey}: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(
    `\nDone. uploaded=${uploaded} skipped(missing)=${skipped} failed=${failed}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
