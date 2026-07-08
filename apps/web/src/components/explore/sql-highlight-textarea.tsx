'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type SqlHighlightTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  placeholder?: string;
  className?: string;
};

const EDITOR_SURFACE_CLASS =
  'box-border font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words [tab-size:2]';

const HIGHLIGHT_LAYER_CLASS =
  '[&_code]:font-[inherit] [&_code]:text-[inherit] [&_code]:leading-[inherit] [&_code]:whitespace-pre-wrap [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0 [&_pre]:font-[inherit] [&_pre]:text-[inherit] [&_pre]:leading-[inherit] [&_pre]:whitespace-pre-wrap [&_span]:font-[inherit]';

export function SqlHighlightTextarea({
  value,
  onChange,
  onRun,
  placeholder = 'SELECT ...',
  className,
}: SqlHighlightTextareaProps) {
  const { resolvedTheme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [highlightedHtml, setHighlightedHtml] = useState('');

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const { codeToHtml } = await import('shiki');
        const html = await codeToHtml(value.length > 0 ? value : ' ', {
          lang: 'sql',
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
          defaultColor: resolvedTheme === 'dark' ? 'dark' : 'light',
        });

        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch {
        if (!cancelled) {
          setHighlightedHtml('');
        }
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [value, resolvedTheme]);

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className={cn('relative min-h-[220px]', className)}>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 overflow-auto p-4',
          EDITOR_SURFACE_CLASS
        )}
        ref={highlightRef}
      >
        <div
          className={HIGHLIGHT_LAYER_CLASS}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting output from shiki
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
      <textarea
        className={cn(
          'relative m-0 block min-h-[220px] w-full resize-y appearance-none border-0 bg-transparent p-4 text-transparent caret-foreground outline-none selection:bg-primary/20',
          EDITOR_SURFACE_CLASS
        )}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            onRun?.();
          }
        }}
        onScroll={syncScroll}
        placeholder={placeholder}
        ref={textareaRef}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
