'use client';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/lib/use-scroll';
import { cn } from '@/lib/utils';

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  const links = [
    {
      label: 'FEATURES',
      href: '#features',
    },
    {
      label: 'PRICING',
      href: '#pricing',
    },
    {
      label: 'DOCS',
      href: 'https://phase.sh/docs',
      external: true,
    },
    {
      label: 'GITHUB',
      href: 'https://github.com/Phase-Analytics/Phase',
      external: true,
    },
  ];

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-2 z-50 mx-auto w-full max-w-5xl border-transparent border-b md:rounded-md md:border md:transition-all md:ease-out',
        {
          'border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/50 md:top-4 md:max-w-4xl md:shadow':
            scrolled && !open,
          'border-border bg-background/98': open,
        }
      )}
    >
      <nav
        className={cn(
          'flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out',
          {
            'md:px-2': scrolled,
          }
        )}
      >
        <Image
          alt="Phase Analytics"
          height={22}
          src="/typography.svg"
          width={90}
        />
        <div className="group hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              className="hover:!opacity-100 text-muted-foreground text-sm underline-offset-4 transition-opacity hover:underline hover:decoration-orange-500 group-hover:opacity-50"
              href={link.href}
              key={link.label}
              {...(link.external && {
                target: '_blank',
                rel: 'noopener noreferrer',
              })}
            >
              {link.label}
            </a>
          ))}
          <Link href="/dashboard">
            <Button className="hover:!opacity-100 cursor-pointer transition-opacity group-hover:opacity-50">
              GET STARTED
            </Button>
          </Link>
        </div>
        <Button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          size="icon"
          variant="outline"
        >
          <MenuToggleIcon className="size-5" duration={300} open={open} />
        </Button>
      </nav>

      <div
        className={cn(
          'fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y bg-background/90 md:hidden',
          open ? 'block' : 'hidden'
        )}
      >
        <div
          className={cn(
            'data-[slot=open]:zoom-in-95 data-[slot=closed]:zoom-out-95 ease-out data-[slot=closed]:animate-out data-[slot=open]:animate-in',
            'flex h-full w-full flex-col gap-y-2 p-4'
          )}
          data-slot={open ? 'open' : 'closed'}
        >
          <div className="grid gap-y-4">
            {links.map((link) => (
              <a
                className="text-muted-foreground text-sm underline-offset-4 hover:underline hover:decoration-orange-500"
                href={link.href}
                key={link.label}
                onClick={() => setOpen(false)}
                {...(link.external && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {link.label}
              </a>
            ))}
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <Button className="w-full cursor-pointer">GET STARTED</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
