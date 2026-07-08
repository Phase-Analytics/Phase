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
    <div className={cn('relative min-h-[220px] font-mono text-sm', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-auto p-4 leading-relaxed"
        ref={highlightRef}
      >
        <div
          className="[&_code]:font-mono [&_code]:text-[13px] [&_code]:leading-relaxed [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting output from shiki
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
      <textarea
        className="relative min-h-[220px] w-full resize-y bg-transparent p-4 text-transparent leading-relaxed caret-foreground outline-none"
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
