'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  type TabsProps,
  TabsTrigger,
} from '@/components/ui/primitives/animate/tabs';
import { cn } from '@/lib/utils';

type CodeTabsProps = {
  codes: Record<string, string>;
  lang?: string;
  themes?: { light: string; dark: string };
  copyButton?: boolean;
  onCopiedChange?: (copied: boolean, content?: string) => void;
} & Omit<TabsProps, 'children'>;

function CodeTabs({
  codes,
  lang = 'bash',
  themes = {
    light: 'github-light',
    dark: 'github-dark',
  },
  className,
  defaultValue,
  value,
  onValueChange,
  copyButton = true,
  onCopiedChange,
  ...props
}: CodeTabsProps) {
  const { resolvedTheme } = useTheme();

  const [highlightedCodes, setHighlightedCodes] = useState<Record<
    string,
    string
  > | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>(
    value ?? defaultValue ?? Object.keys(codes)[0] ?? ''
  );

  useEffect(() => {
    async function loadHighlightedCode() {
      try {
        const { codeToHtml } = await import('shiki');
        const newHighlightedCodes: Record<string, string> = {};

        for (const [command, val] of Object.entries(codes)) {
          const highlighted = await codeToHtml(val, {
            lang,
            themes: {
              light: themes.light,
              dark: themes.dark,
            },
            defaultColor: resolvedTheme === 'dark' ? 'dark' : 'light',
          });

          newHighlightedCodes[command] = highlighted;
        }

        setHighlightedCodes(newHighlightedCodes);
      } catch (error) {
        console.error('Error highlighting codes', error);
        setHighlightedCodes(codes);
      }
    }
    loadHighlightedCode();
  }, [resolvedTheme, lang, themes.light, themes.dark, codes]);

  return (
    <Tabs
      className={cn(
        'w-full gap-0 overflow-hidden rounded-xl border bg-muted/50',
        className
      )}
      data-slot="install-tabs"
      {...props}
      onValueChange={(val) => {
        setSelectedCode(val);
        onValueChange?.(val);
      }}
      value={selectedCode}
    >
      <TabsHighlight className="absolute inset-0 z-0 rounded-none bg-transparent shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-full after:bg-black after:content-[''] dark:after:bg-white">
        <TabsList
          className="relative flex h-10 w-full items-center justify-between rounded-none border-border/75 border-b bg-muted px-4 py-0 text-current dark:border-border/50"
          data-slot="install-tabs-list"
        >
          <div className="flex h-full gap-x-3">
            {highlightedCodes &&
              Object.keys(highlightedCodes).map((code) => (
                <TabsHighlightItem
                  className="flex items-center justify-center"
                  key={code}
                  value={code}
                >
                  <TabsTrigger
                    className="h-full px-0 font-medium text-muted-foreground text-sm data-[state=active]:text-current"
                    key={code}
                    value={code}
                  >
                    {code}
                  </TabsTrigger>
                </TabsHighlightItem>
              ))}
          </div>

          {copyButton && highlightedCodes && (
            <CopyButton
              className="-me-2.5 bg-transparent hover:bg-black/5 dark:hover:bg-white/10"
              content={codes[selectedCode]}
              onCopiedChange={onCopiedChange}
              size="xs"
              variant="ghost"
            />
          )}
        </TabsList>
      </TabsHighlight>

      <TabsContents data-slot="install-tabs-contents">
        {highlightedCodes &&
          Object.entries(highlightedCodes).map(([code, val]) => (
            <TabsContent
              className="w-full"
              data-slot="install-tabs-content"
              key={code}
              value={code}
            >
              <div
                className="flex w-full items-center overflow-auto p-4 text-sm [&>pre,&_code]:border-none [&>pre,&_code]:bg-transparent! [&>pre,&_code]:[background:transparent_!important] [&_code]:text-[13px]! [&_code_.line]:px-0!"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for syntax highlighting
                dangerouslySetInnerHTML={{ __html: val }}
              />
            </TabsContent>
          ))}
      </TabsContents>
    </Tabs>
  );
}

export { CodeTabs, type CodeTabsProps };
