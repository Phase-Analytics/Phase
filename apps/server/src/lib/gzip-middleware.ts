import { Elysia } from 'elysia';

declare const Bun: {
  gunzipSync(data: Uint8Array): Uint8Array;
};

const MAX_COMPRESSED_SIZE = 10 * 1024 * 1024;
const MAX_DECOMPRESSED_SIZE = 50 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;

export const gzipDecompressionPlugin = new Elysia({
  name: 'gzip-decompression',
}).onParse(async ({ request, contentType }) => {
  const contentEncoding = request.headers.get('content-encoding');

  if (contentEncoding?.toLowerCase() === 'gzip') {
    let text: string;

    try {
      const compressed = await request.arrayBuffer();

      if (compressed.byteLength > MAX_COMPRESSED_SIZE) {
        throw new Error(
          `Compressed payload exceeds limit of ${MAX_COMPRESSED_SIZE} bytes`
        );
      }

      const theoreticalMaxSize = compressed.byteLength * MAX_COMPRESSION_RATIO;
      if (theoreticalMaxSize > MAX_DECOMPRESSED_SIZE) {
        throw new Error(
          `Compressed payload (${compressed.byteLength} bytes) could expand beyond safe limits (theoretical max: ${theoreticalMaxSize} bytes)`
        );
      }

      let decompressed: Uint8Array;
      try {
        decompressed = Bun.gunzipSync(new Uint8Array(compressed));
      } catch (error) {
        console.error('[GzipMiddleware] Decompression error:', error);
        throw new Error('Decompression failed - invalid or malicious payload');
      }

      if (decompressed.byteLength > MAX_DECOMPRESSED_SIZE) {
        throw new Error(
          `Decompressed payload exceeds limit of ${MAX_DECOMPRESSED_SIZE} bytes`
        );
      }

      const compressionRatio =
        compressed.byteLength > 0
          ? decompressed.byteLength / compressed.byteLength
          : 0;
      if (compressionRatio > MAX_COMPRESSION_RATIO) {
        throw new Error(
          `Suspicious compression ratio ${compressionRatio.toFixed(1)}:1 exceeds limit of ${MAX_COMPRESSION_RATIO}:1`
        );
      }

      text = new TextDecoder().decode(decompressed);

      console.log(
        `[GzipMiddleware] Decompressed ${compressed.byteLength} → ${decompressed.byteLength} bytes`
      );
    } catch (error) {
      console.error('[GzipMiddleware] Decompression failed:', error);
      throw new Error('Failed to decompress gzip content');
    }

    // Parse JSON outside decompression try-catch to avoid misreporting parsing errors
    if (contentType?.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw new Error(
          `Failed to parse decompressed content as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    }

    return text;
  }
});
