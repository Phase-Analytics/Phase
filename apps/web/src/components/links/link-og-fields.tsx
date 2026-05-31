'use client';

import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LINK_OG_IMAGE } from '@phase/shared';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatApiErrorMessage } from '@/lib/format-api-error';
import { ignorePromiseRejection } from '@/lib/ignore-promise-rejection';
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

export function linkOgToPayload(values: LinkOgValues) {
  return {
    ogTitle: values.title.trim() || null,
    ogDescription: values.description.trim() || null,
  };
}

type LinkOgFieldsProps = {
  appId: string;
  linkId?: string;
  values: LinkOgValues;
  ogImageUrl: string | null;
  onChange: (values: LinkOgValues) => void;
  onImageUrlChange: (url: string | null) => void;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
};

export function LinkOgFields({
  appId,
  linkId,
  values,
  ogImageUrl,
  onChange,
  onImageUrlChange,
  pendingFile,
  onPendingFileChange,
}: LinkOgFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadImage = useUploadLinkOgImage(appId, linkId ?? '');
  const deleteImage = useDeleteLinkOgImage(appId, linkId ?? '');

  const previewUrl = pendingFile
    ? URL.createObjectURL(pendingFile)
    : ogImageUrl;

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
        onImageUrlChange(updated.ogImageUrl);
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
        Recommended image: {LINK_OG_IMAGE.width}×{LINK_OG_IMAGE.height}px (
        {LINK_OG_IMAGE.aspectRatio}). Min {LINK_OG_IMAGE.minWidth}×
        {LINK_OG_IMAGE.minHeight}px. JPEG, PNG, or WebP up to 5MB. We resize and
        compress to WebP on upload.
      </p>

      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="og-title">
          Preview title
        </label>
        <Input
          id="og-title"
          onChange={(event) =>
            onChange({ ...values, title: event.target.value })
          }
          placeholder="Defaults to destination hostname"
          value={values.title}
        />
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor="og-description">
          Preview description
        </label>
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-[var(--shadow),var(--highlight)] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30'
          )}
          id="og-description"
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ ...values, description: event.target.value })
          }
          placeholder="Optional"
          rows={3}
          value={values.description}
        />
      </div>

      <div className="space-y-2">
        <p className="font-medium text-sm">Preview image</p>
        {previewUrl ? (
          <div className="space-y-2">
            {/* biome-ignore lint/performance/noImgElement: user R2 preview URLs */}
            <img
              alt="Link preview"
              className="aspect-[1200/630] w-full max-w-md rounded-md border object-cover"
              height={630}
              src={previewUrl}
              width={1200}
            />
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
