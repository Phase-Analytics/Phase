'use client';

import { KnightShieldIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function AccessDenied() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md border-destructive/20 py-0">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <HugeiconsIcon
              className="size-12 text-destructive"
              icon={KnightShieldIcon}
            />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-2xl">Access Denied</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You do not have permission to access this resource. Please make
              sure you have the necessary permissions or contact the application
              owner.
            </p>
          </div>
          <Link href="/dashboard">
            <Button size="sm" variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
