'use client';

import { AlertSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <HugeiconsIcon
                  className="size-5 text-destructive"
                  icon={AlertSquareIcon}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Failed to load data</h3>
                <p className="text-muted-foreground text-xs">
                  {this.state.error?.message || 'Something went wrong'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Reload page
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
