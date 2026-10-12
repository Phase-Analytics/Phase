import { LINK_OG_IMAGE } from '@phase/shared';

// Must match LINK_OG_IMAGE.acceptMimeTypes and the upload UI copy.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const SHARP_OPTIONS = {
  animated: false,
  limitInputPixels: LINK_OG_IMAGE.maxDecodePixels,
} as const;

type SharpFactory = (
  input: Buffer,
  options?: { animated?: boolean }
) => import('sharp').Sharp;

let sharpPromise: Promise<SharpFactory> | null = null;

function getSharp(): Promise<SharpFactory> {
  if (!sharpPromise) {
    sharpPromise = import('sharp')
      .then((mod) => {
        const sharp = (mod as { default?: SharpFactory }).default ?? mod;
        return sharp as SharpFactory;
      })
      .catch(() => {
        sharpPromise = null;
        throw new LinkOgImageError(
          'Image processing is unavailable on this server'
        );
      });
  }

  return sharpPromise;
}

export class LinkOgImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkOgImageError';
  }
}

export async function processLinkOgImage(input: Buffer): Promise<Buffer> {
  if (!input.byteLength) {
    throw new LinkOgImageError('Missing image file');
  }

  if (input.byteLength > LINK_OG_IMAGE.maxUploadBytes) {
    throw new LinkOgImageError(
      `Image must be ${Math.round(LINK_OG_IMAGE.maxUploadBytes / (1024 * 1024))}MB or smaller`
    );
  }

  const sharp = await getSharp();
  // One pipeline: metadata() only reads the header, the resize decodes once.
  const image = sharp(input, SHARP_OPTIONS);

  let format: string | undefined;
  try {
    format = (await image.metadata()).format;
  } catch {
    throw new LinkOgImageError('Invalid image file');
  }

  if (!(format && ALLOWED_FORMATS.has(format))) {
    throw new LinkOgImageError('Use JPEG, PNG, or WebP');
  }

  try {
    const output = await image
      .rotate()
      .resize(LINK_OG_IMAGE.width, LINK_OG_IMAGE.height, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    if (output.byteLength > LINK_OG_IMAGE.maxProcessedBytes) {
      throw new LinkOgImageError('Processed image is too large');
    }

    return output;
  } catch (error) {
    if (error instanceof LinkOgImageError) {
      throw error;
    }
    throw new LinkOgImageError('Failed to process image');
  }
}
