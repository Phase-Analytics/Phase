'use client';

import {
  Activity03Icon,
  CursorPointer02Icon,
  GithubIcon,
  GlobalIcon,
  Home01Icon,
  LayoutGridIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <div className="-z-10 absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />

      <div className="-top-40 -right-40 absolute size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="-bottom-40 -left-40 absolute size-96 rounded-full bg-orange-500/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl text-center">
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
            <Image
              alt="Phase"
              className="relative"
              height={60}
              src="/logo.svg"
              width={60}
            />
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <h1 className="font-regular font-sans text-8xl tracking-tighter sm:text-9xl">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              404
            </span>
          </h1>

          <h2 className="font-regular font-sans text-4xl tracking-tighter sm:text-5xl lg:text-6xl">
            Lost in the{' '}
            <span className="underline decoration-2 decoration-orange-500 decoration-skip-ink-none underline-offset-12">
              analytics
            </span>
          </h2>

          <p className="mx-auto max-w-2xl text-md text-muted-foreground leading-relaxed sm:text-xl">
            Looks like this page went off the grid. Don't worry, we're tracking
            everything else perfectly.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button
              className="group relative overflow-hidden"
              size="lg"
              variant="outline"
            >
              <HugeiconsIcon className="mr-2" icon={Home01Icon} />
              <span className="relative z-10 font-semibold">Home</span>
              <div className="-z-0 absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button
              className="group relative overflow-hidden"
              size="lg"
              variant="default"
            >
              <HugeiconsIcon className="mr-2" icon={LayoutGridIcon} />
              <span className="relative z-10 font-bold">Dashboard</span>
              <div className="-z-0 absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </Link>
        </div>

        <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="https://status.phase.sh"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button size="sm" variant="ghost">
              <HugeiconsIcon className="mr-2" icon={Activity03Icon} />
              <span className="font-sans text-xs">Status</span>
            </Button>
          </Link>

          <Link
            href="https://github.com/Phase-Analytics/Phase"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button size="sm" variant="ghost">
              <HugeiconsIcon className="mr-2" icon={GithubIcon} />
              <span className="font-sans text-xs">GitHub</span>
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 opacity-60">
          <div className="flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-xs backdrop-blur-sm">
            <HugeiconsIcon
              className="size-4 text-blue-400"
              icon={CursorPointer02Icon}
            />
            <span>Still tracking events</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-xs backdrop-blur-sm">
            <HugeiconsIcon className="size-4 text-red-400" icon={GlobalIcon} />
            <span>Realtime working</span>
          </div>
        </div>
      </div>
    </div>
  );
}
