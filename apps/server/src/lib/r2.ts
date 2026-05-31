import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const TRAILING_SLASH_RE = /\/+$/;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
};

function trimTrailingSlash(url: string): string {
  return url.replace(TRAILING_SLASH_RE, '');
}

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (
    !(
      accountId &&
      accessKeyId &&
      secretAccessKey &&
      bucketName &&
      publicBaseUrl
    )
  ) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl: trimTrailingSlash(publicBaseUrl),
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

let client: S3Client | null = null;

function getR2Client(config: R2Config): S3Client {
  if (!client) {
    const endpoint =
      process.env.R2_ENDPOINT?.trim() ||
      `https://${config.accountId}.r2.cloudflarestorage.com`;

    client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return client;
}

export function buildLinkOgObjectKey(appId: string, linkId: string): string {
  return `links/${appId}/${linkId}/og.jpg`;
}

export function buildR2PublicUrl(config: R2Config, objectKey: string): string {
  return `${config.publicBaseUrl}/${objectKey}`;
}

export function extractR2ObjectKeyFromPublicUrl(
  publicUrl: string,
  config: R2Config
): string | null {
  const baseUrl = publicUrl.split('?')[0] ?? publicUrl;
  const prefix = `${config.publicBaseUrl}/`;
  if (!baseUrl.startsWith(prefix)) {
    return null;
  }

  return baseUrl.slice(prefix.length);
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  const s3 = getR2Client(config);

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return buildR2PublicUrl(config, params.key);
}

export async function deleteFromR2(key: string): Promise<void> {
  const config = getR2Config();
  if (!config) {
    return;
  }

  const s3 = getR2Client(config);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );
}

export async function deleteR2ObjectByPublicUrl(
  publicUrl: string | null | undefined
): Promise<void> {
  if (!publicUrl) {
    return;
  }

  const config = getR2Config();
  if (!config) {
    return;
  }

  const key = extractR2ObjectKeyFromPublicUrl(publicUrl, config);
  if (!key) {
    return;
  }

  await deleteFromR2(key);
}
