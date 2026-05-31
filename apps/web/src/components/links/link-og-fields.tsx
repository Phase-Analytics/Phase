'use client';

import {
  Image01Icon,
  TextAlignJustifyCenterIcon,
  TextFontIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { LINK_OG_IMAGE } from '@phase/shared';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatApiErrorMessage } from '@/lib/format-api-error';
import { ignorePromiseRejection } from '@/lib/ignore-promise-rejection';
import { getLinkOgImageSrc } from '@/lib/link-og-image-url';
import {
  useDeleteLinkOgImage,
  useUploadLinkOgImage,
} from '@/lib/queries/use-links';
import { cn } from '@/lib/utils';

export type LinkOgValues = {
  title: string;
  description: string;
};

export function emptyLinkOgValues(): LinkOgValues {
  return { title: '', description: '' };
}

export function linkOgFromDetail(link: {
  ogTitle: string | null;
  ogDescription: string | null;
}): LinkOgValues {
  return {
    title: link.ogTitle ?? '',
    description: link.ogDescription ?? '',
  };
}

export function hasLinkOgTextValues(values: LinkOgValues): boolean {
  return Boolean(values.title.trim() || values.description.trim());
}

export function hasLinkOgPreview(link: {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
}): boolean {
  return Boolean(
    link.ogTitle?.trim() ||
      link.ogDescription?.trim() ||
      link.ogImageUrl?.trim()
  );
}

export const LINK_OG_TEXT_FIELDS: Array<{
  key: keyof Pick<LinkOgValues, 'title' | 'description'>;
  label: string;
  icon: IconSvgElement;
  id: string;
  multiline?: boolean;
}> = [
  {
    key: 'title',
    label: 'Title',
    icon: TextFontIcon,
    id: 'og-title',
  },
  {
    key: 'description',
    label: 'Description',
    icon: TextAlignJustifyCenterIcon,
    id: 'og-description',
    multiline: true,
  },
];

export function linkOgToPayload(values: LinkOgValues) {
  return {
    ogTitle: values.title.trim() || null,
    ogDescription: values.description.trim() || null,
  };
}

type LinkOgFieldsProps = {
  appId: string;
  linkId?: string;
  showSocialPreview?: boolean;
  values: LinkOgValues;
  ogImageUrl: string | null;
  ogImageCacheKey?: string | null;
  onChange: (values: LinkOgValues) => void;
  onImageUrlChange: (url: string | null) => void;
  onOgImageCacheKeyChange?: (key: string | null) => void;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
};

export function LinkOgFields({
  appId,
  linkId,
  showSocialPreview = true,
  values,
  ogImageUrl,
  ogImageCacheKey,
  onChange,
  onImageUrlChange,
  onOgImageCacheKeyChange,
  pendingFile,
  onPendingFileChange,
}: LinkOgFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadImage = useUploadLinkOgImage(appId, linkId ?? '');
  const deleteImage = useDeleteLinkOgImage(appId, linkId ?? '');

  const previewUrl = pendingFile
    ? URL.createObjectURL(pendingFile)
    : getLinkOgImageSrc(ogImageUrl, ogImageCacheKey);

  const handleFile = async (file: File | null) => {
    setUploadError(null);
    if (!file) {
      onPendingFileChange(null);
      return;
    }

    if (file.size > LINK_OG_IMAGE.maxUploadBytes) {
      setUploadError('Image must be 5MB or smaller');
      return;
    }

    if (!LINK_OG_IMAGE.acceptMimeTypes.includes(file.type as never)) {
      setUploadError('Use JPEG, PNG, or WebP');
      return;
    }

    if (linkId) {
      try {
        const updated = await uploadImage.mutateAsync(file);
        if (!updated.ogImageUrl) {
          setUploadError('Image upload did not complete');
          return;
        }
        onImageUrlChange(updated.ogImageUrl);
        onOgImageCacheKeyChange?.(updated.updatedAt);
        onPendingFileChange(null);
      } catch (err) {
        setUploadError(formatApiErrorMessage(err));
      }
      return;
    }

    onPendingFileChange(file);
  };

  const handleRemoveImage = async () => {
    setUploadError(null);
    onPendingFileChange(null);

    if (linkId && ogImageUrl) {
      try {
        const updated = await deleteImage.mutateAsync();
        onImageUrlChange(updated.ogImageUrl);
      } catch (err) {
        setUploadError(formatApiErrorMessage(err));
        return;
      }
    } else {
      onImageUrlChange(null);
    }
  };

  const imageBusy = uploadImage.isPending || deleteImage.isPending;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Recommended: {LINK_OG_IMAGE.width}x{LINK_OG_IMAGE.height}, Min{' '}
        {LINK_OG_IMAGE.minWidth}x{LINK_OG_IMAGE.minHeight}. JPEG, PNG or WEBP up
        to 5MB.
      </p>

      {LINK_OG_TEXT_FIELDS.map((field) => (
        <div className="space-y-2" key={field.key}>
          <label
            className="flex items-center gap-1.5 font-medium text-sm"
            htmlFor={field.id}
          >
            <HugeiconsIcon
              className="size-4 shrink-0 text-muted-foreground"
              icon={field.icon}
            />
            {field.label}
          </label>
          {field.multiline ? (
            <textarea
              className={cn(
                'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-[var(--shadow),var(--highlight)] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30'
              )}
              id={field.id}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                onChange({ ...values, [field.key]: event.target.value })
              }
              placeholder="Optional"
              rows={3}
              value={values[field.key]}
            />
          ) : (
            <Input
              id={field.id}
              onChange={(event) =>
                onChange({ ...values, [field.key]: event.target.value })
              }
              placeholder="Defaults to destination hostname"
              value={values[field.key]}
            />
          )}
        </div>
      ))}

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 font-medium text-sm">
          <HugeiconsIcon
            className="size-4 shrink-0 text-muted-foreground"
            icon={Image01Icon}
          />
          Image
        </p>
        {imageBusy && linkId ? (
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Spinner className="size-3.5" />
            Uploading image...
          </p>
        ) : null}
        {previewUrl ? (
          <div className="space-y-2">
            {showSocialPreview ? (
              // biome-ignore lint/performance/noImgElement: user R2 preview URLs
              <img
                alt="Link preview"
                className="aspect-[1200/630] w-full max-w-md rounded-md border object-cover"
                height={630}
                src={previewUrl}
                width={1200}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={imageBusy}
                onClick={() => inputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                Replace
              </Button>
              <Button
                disabled={imageBusy}
                onClick={() => {
                  handleRemoveImage().catch(ignorePromiseRejection);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove image
              </Button>
            </div>
          </div>
        ) : (
          <Button
            disabled={imageBusy}
            onClick={() => inputRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={Image01Icon} />
            Upload image
          </Button>
        )}
        {!linkId && pendingFile ? (
          <p className="text-muted-foreground text-xs">
            Image uploads when you save the link.
          </p>
        ) : null}
        {uploadError ? (
          <p className="text-destructive text-xs">{uploadError}</p>
        ) : null}
      </div>

      <input
        accept={LINK_OG_IMAGE.acceptExtensions}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          handleFile(file).catch(ignorePromiseRejection);
          event.target.value = '';
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
