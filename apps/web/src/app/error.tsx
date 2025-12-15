'use client';

import { AlertSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { ScrollArea } from '@/components/ui/scroll-area';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  const errorDetails = `Error: ${error.message}
${error.digest ? `\nError ID: ${error.digest}` : ''}
${error.stack ? `\n\nStack Trace:\n${error.stack}` : ''}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 ring-4 ring-destructive/5">
              <HugeiconsIcon
                className="size-6 text-destructive"
                icon={AlertSquareIcon}
              />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Something went wrong</CardTitle>
              <CardDescription className="mt-1">
                An unexpected error occurred. Please try again or contact
                support if the issue persists.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Error Details</h4>
                <CopyButton content={errorDetails} size="xs" variant="ghost" />
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5">
                <ScrollArea className="h-[200px] w-full">
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                          Message
                        </p>
                        <p className="font-mono text-destructive text-sm leading-relaxed">
                          {error.message}
                        </p>
                      </div>
                      {error.digest && (
                        <div>
                          <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Error ID
                          </p>
                          <p className="font-mono text-muted-foreground text-xs">
                            {error.digest}
                          </p>
                        </div>
                      )}
                      {error.stack && (
                        <div>
                          <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                            Stack Trace
                          </p>
                          <pre className="font-mono text-muted-foreground text-xs leading-relaxed">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={reset}
              type="button"
              variant="outline"
            >
              Try again
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                window.location.href = '/dashboard';
              }}
              type="button"
              variant="default"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
