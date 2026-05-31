export const LINK_OG_IMAGE = {
  width: 1200,
  height: 630,
  aspectRatio: '1.91:1',
  minWidth: 600,
  minHeight: 315,
  maxUploadBytes: 5 * 1024 * 1024,
  maxDecodePixels: 16_000_000,
  maxProcessedBytes: 2 * 1024 * 1024,
  acceptMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  acceptExtensions: '.jpg,.jpeg,.png,.webp',
} as const;
