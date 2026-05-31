import { LINK_OG_IMAGE } from '@phase/shared';
import sharp from 'sharp';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

export class LinkOgImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkOgImageError';
  }
}

export async function processLinkOgImage(input: Buffer): Promise<Buffer> {
  if (input.byteLength > LINK_OG_IMAGE.maxUploadBytes) {
    throw new LinkOgImageError(
      `Image must be ${Math.round(LINK_OG_IMAGE.maxUploadBytes / (1024 * 1024))}MB or smaller`
    );
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(input, { animated: false }).metadata();
  } catch {
    throw new LinkOgImageError('Invalid image file');
  }

  if (!(metadata.format && ALLOWED_FORMATS.has(metadata.format))) {
    throw new LinkOgImageError('Use JPEG, PNG, or WebP');
  }

  try {
    return await sharp(input, { animated: false })
      .rotate()
      .resize(LINK_OG_IMAGE.width, LINK_OG_IMAGE.height, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch {
    throw new LinkOgImageError('Failed to process image');
  }
}
