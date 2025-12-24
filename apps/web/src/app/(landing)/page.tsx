'use client';

import {
  CopyrightIcon,
  CursorPointer02Icon,
  GithubIcon,
  GlobalIcon,
  Mail01Icon,
  MirroringScreenIcon,
  NewTwitterIcon,
  PlaySquareIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ExpandCard, LocationMap } from '@/components/expand';
import { LogoCloud } from '@/components/logo-slider';
import { Button } from '@/components/ui/button';
import AnimatedFlow from './animation';
import { Footer } from './footer';
import { Header } from './header';
import { PricingTable } from './pricing';

export default function HomePage() {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const handleCardToggle = (cardId: string) => {
    setExpandedCardId((prev) => (prev === cardId ? null : cardId));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div
        className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-12 lg:px-8 lg:py-16"
        id="hero"
      >
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center space-y-4">
            <h1 className="font-regular font-sans text-4xl tracking-tighter sm:text-5xl lg:text-6xl">
              Mobile analytics for{' '}
              <span className="underline decoration-2 decoration-orange-500 decoration-skip-ink-none underline-offset-[12px]">
                developers
              </span>
            </h1>
            <p className="text-md text-muted-foreground leading-relaxed sm:text-xl">
              Track user behavior, measure engagement, and optimize your product
              with real-time analytics that respects privacy.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/dashboard">
                <Button
                  className="group relative cursor-pointer overflow-hidden"
                  size="lg"
                >
                  <span className="relative z-10 font-bold text-md">
                    Start Tracking
                  </span>
                  <div className="-z-0 absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs">
                <Image
                  alt="Swift"
                  className="size-3"
                  height={12}
                  src="/svg/swift.svg"
                  width={12}
                />
                Swift
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs">
                <Image
                  alt="React Native"
                  className="size-3"
                  height={12}
                  src="/svg/react-native.svg"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(1602%) hue-rotate(160deg) brightness(101%) contrast(97%)',
                  }}
                  width={12}
                />
                React Native
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <AnimatedFlow
              centerCircle={
                <Image alt="Phase" height={40} src="/logo.svg" width={40} />
              }
              className="w-full"
              innerBadges={[
                {
                  icon: (
                    <svg
                      fill="none"
                      height="12"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      width="12"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Realtime</title>
                      <path d="M14 2.20004C13.3538 2.06886 12.6849 2 12 2C11.3151 2 10.6462 2.06886 10 2.20004M21.8 10C21.9311 10.6462 22 11.3151 22 12C22 12.6849 21.9311 13.3538 21.8 14M14 21.8C13.3538 21.9311 12.6849 22 12 22C11.3151 22 10.6462 21.9311 10 21.8M2.20004 14C2.06886 13.3538 2 12.6849 2 12C2 11.3151 2.06886 10.6462 2.20004 10M17.5 3.64702C18.6332 4.39469 19.6053 5.36678 20.353 6.5M20.353 17.5C19.6053 18.6332 18.6332 19.6053 17.5 20.353M6.5 20.353C5.36678 19.6053 4.39469 18.6332 3.64702 17.5M3.64702 6.5C4.39469 5.36678 5.36678 4.39469 6.5 3.64702" />
                    </svg>
                  ),
                  text: 'REALTIME UPDATES',
                },
              ]}
              methods={['USERS', 'SESSIONS', 'EVENTS', 'SCREENS']}
              topBadge={{
                icon: (
                  <svg
                    fill="none"
                    height="12"
                    key="server-stack-icon"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="12"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>Server Stack</title>
                    <path d="M18 3H6C5.06812 3 4.60218 3 4.23463 3.15224C3.74458 3.35523 3.35523 3.74458 3.15224 4.23463C3 4.60218 3 5.06812 3 6C3 6.93188 3 7.39782 3.15224 7.76537C3.35523 8.25542 3.74458 8.64477 4.23463 8.84776C4.60218 9 5.06812 9 6 9H18C18.9319 9 19.3978 9 19.7654 8.84776C20.2554 8.64477 20.6448 8.25542 20.8478 7.76537C21 7.39782 21 6.93188 21 6C21 5.06812 21 4.60218 20.8478 4.23463C20.6448 3.74458 20.2554 3.35523 19.7654 3.15224C19.3978 3 18.9319 3 18 3Z" />
                    <path d="M18 9H6C5.06812 9 4.60218 9 4.23463 9.15224C3.74458 9.35523 3.35523 9.74458 3.15224 10.2346C3 10.6022 3 11.0681 3 12C3 12.9319 3 13.3978 3.15224 13.7654C3.35523 14.2554 3.74458 14.6448 4.23463 14.8478C4.60218 15 5.06812 15 6 15H18C18.9319 15 19.3978 15 19.7654 14.8478C20.2554 14.6448 20.6448 14.2554 20.8478 13.7654C21 13.3978 21 12.9319 21 12C21 11.0681 21 10.6022 20.8478 10.2346C20.6448 9.74458 20.2554 9.35523 19.7654 9.15224C19.3978 9 18.9319 9 18 9Z" />
                    <path d="M18 15H6C5.06812 15 4.60218 15 4.23463 15.1522C3.74458 15.3552 3.35523 15.7446 3.15224 16.2346C3 16.6022 3 17.0681 3 18C3 18.9319 3 19.3978 3.15224 19.7654C3.35523 20.2554 3.74458 20.6448 4.23463 20.8478C4.60218 21 5.06812 21 6 21H18C18.9319 21 19.3978 21 19.7654 20.8478C20.2554 20.6448 20.6448 20.2554 20.8478 19.7654C21 19.3978 21 18.9319 21 18C21 17.0681 21 16.6022 20.8478 16.2346C20.6448 15.7446 20.2554 15.3552 19.7654 15.1522C19.3978 15 18.9319 15 18 15Z" />
                    <path d="M6 6H6.01" />
                    <path d="M6 12H6.01" />
                    <path d="M6 18H6.01" />
                    <path d="M9 6H9.01" />
                    <path d="M9 12H9.01" />
                    <path d="M9 18H9.01" />
                  </svg>
                ),
                text: 'PHASE INFRASTRUCTURE',
              }}
            />
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
        <div className="text-center">
          <p className="mb-6 font-medium text-lg text-muted-foreground uppercase tracking-wider">
            Built with industry-leading technologies
          </p>
          <LogoCloud
            className="[&_img]:h-8 [&_img]:md:h-10"
            logos={[
              {
                alt: 'Bun',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/bun.svg',
                width: 40,
              },
              {
                alt: 'TypeScript',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/typescript.svg',
                width: 40,
              },
              {
                alt: 'Elysia',
                className: 'dark:invert',
                height: 40,
                src: '/svg/elysiajs.svg',
                width: 40,
              },
              {
                alt: 'React',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/react.svg',
                width: 40,
              },
              {
                alt: 'Next.js',
                className: 'dark:invert',
                height: 40,
                src: '/svg/nextjs.svg',
                width: 40,
              },
              {
                alt: 'TanStack',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/tanstack.svg',
                width: 40,
              },
              {
                alt: 'PostgreSQL',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/postgresql.svg',
                width: 40,
              },
              {
                alt: 'Redis',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/redis.svg',
                width: 40,
              },
              {
                alt: 'QuestDB',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/questdb.svg',
                width: 40,
              },
              {
                alt: 'Better Auth',
                className: 'dark:invert',
                height: 40,
                src: '/svg/better-auth.svg',
                width: 40,
              },
              {
                alt: 'Plunk',
                className: 'dark:invert',
                height: 40,
                src: '/svg/plunk.svg',
                width: 40,
              },
              {
                alt: 'Docker',
                className: 'dark:brightness-0 dark:invert',
                height: 40,
                src: '/svg/docker.svg',
                width: 40,
              },
            ]}
          />
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-5xl px-4 py-12 lg:px-8 lg:py-16"
        id="features"
      >
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="mb-3 font-semibold text-lg text-muted-foreground uppercase">
              Features
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <LocationMap
              coordinates="San Francisco, USA"
              isExpanded={expandedCardId === 'geolocation'}
              location="Geolocation"
              onToggle={() => handleCardToggle('geolocation')}
              statusText="map"
            />
            <ExpandCard
              expandedIcon={
                <svg
                  className="drop-shadow-lg"
                  fill="none"
                  height="32"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
                  }}
                  viewBox="0 0 24 24"
                  width="32"
                >
                  <title>User tracking icon</title>
                  <circle cx="12" cy="8" fill="#3B82F6" r="4" />
                  <path
                    d="M4 20c0-4 3.5-7 8-7s8 3 8 7"
                    fill="#3B82F6"
                    opacity="0.7"
                  />
                </svg>
              }
              iconGlowColor="rgba(59, 130, 246, 0.6)"
              isExpanded={expandedCardId === 'user-tracking'}
              onToggle={() => handleCardToggle('user-tracking')}
              statusBadge={{
                text: 'Active',
                color: '#3B82F6',
              }}
              triggerIcon={
                <HugeiconsIcon
                  className="h-[18px] w-[18px] text-blue-400"
                  icon={UserIcon}
                />
              }
              triggerSubtext="741 users online"
              triggerText="User Tracking"
            />
            <ExpandCard
              expandedIcon={
                <HugeiconsIcon
                  className="text-orange-400"
                  icon={PlaySquareIcon}
                  size={32}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(251, 146, 60, 0.5))',
                  }}
                />
              }
              iconGlowColor="rgba(251, 146, 60, 0.6)"
              isExpanded={expandedCardId === 'session-tracking'}
              onToggle={() => handleCardToggle('session-tracking')}
              statusBadge={{
                text: 'Duration',
                color: '#FB923C',
              }}
              triggerIcon={
                <HugeiconsIcon
                  className="h-[18px] w-[18px] text-orange-400"
                  icon={PlaySquareIcon}
                />
              }
              triggerSubtext="2m 41s Average Session Duration"
              triggerText="Session Tracking"
            />
            <ExpandCard
              expandedIcon={
                <HugeiconsIcon
                  className="text-purple-400"
                  icon={CursorPointer02Icon}
                  size={32}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.5))',
                  }}
                />
              }
              iconGlowColor="rgba(168, 85, 247, 0.6)"
              isExpanded={expandedCardId === 'event-tracking'}
              onToggle={() => handleCardToggle('event-tracking')}
              statusBadge={{
                text: 'click',
                color: '#A855F7',
              }}
              triggerIcon={
                <HugeiconsIcon
                  className="h-[18px] w-[18px] text-purple-400"
                  icon={CursorPointer02Icon}
                />
              }
              triggerSubtext="8263 Events Today"
              triggerText="Event Tracking"
            />
            <ExpandCard
              expandedIcon={
                <HugeiconsIcon
                  className="text-yellow-400"
                  icon={MirroringScreenIcon}
                  size={32}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.5))',
                  }}
                />
              }
              iconGlowColor="rgba(234, 179, 8, 0.6)"
              isExpanded={expandedCardId === 'screen-navigation'}
              onToggle={() => handleCardToggle('screen-navigation')}
              statusBadge={{
                text: 'navigation',
                color: '#EAB308',
              }}
              triggerIcon={
                <HugeiconsIcon
                  className="h-[18px] w-[18px] text-yellow-400"
                  icon={MirroringScreenIcon}
                />
              }
              triggerSubtext="43 People Viewed /paywall"
              triggerText="Screen Navigation"
            />
            <ExpandCard
              expandedIcon={
                <HugeiconsIcon
                  className="text-red-400"
                  icon={GlobalIcon}
                  size={32}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(248, 113, 113, 0.5))',
                  }}
                />
              }
              iconGlowColor="rgba(248, 113, 113, 0.6)"
              isExpanded={expandedCardId === 'realtime-screen'}
              onToggle={() => handleCardToggle('realtime-screen')}
              statusBadge={{
                text: 'Live',
                color: '#F87171',
              }}
              triggerIcon={
                <HugeiconsIcon
                  className="h-[18px] w-[18px] text-red-400"
                  icon={GlobalIcon}
                />
              }
              triggerSubtext="Bob Marley started new session."
              triggerText="Realtime Screen"
            />
          </div>
        </div>
      </section>

      <PricingTable
        features={[
          { name: 'Unlimited Users', included: 'all' },
          { name: 'Unlimited Sessions', included: 'all' },
          { name: 'Realtime Analytics', included: 'all' },
          { name: 'Geolocation', included: 'all' },
          { name: 'Unlimited Team Seats', included: 'all' },
          {
            name: 'Data Retention',
            included: 'all',
            values: { free: '1 Year', starter: '1 Year', pro: '1 Year' },
          },
          { name: 'Weekly Reports', included: 'starter' },
          {
            name: 'Event Tracking',
            included: 'all',
            values: { free: '150K/mo', starter: '5M/mo', pro: '25M/mo' },
          },
          {
            name: 'Support',
            included: 'all',
            values: { free: 'Email', starter: 'Email', pro: 'Custom' },
          },
        ]}
        plans={[
          {
            name: 'Free',
            level: 'free',
            price: { monthly: 0, yearly: 0 },
          },
          {
            name: 'Starter',
            level: 'starter',
            price: { monthly: 20, yearly: 200 },
            popular: true,
          },
          {
            name: 'Enterprise',
            level: 'pro',
            price: { monthly: 50, yearly: 500 },
          },
        ]}
      />

      <Footer
        brandName="Phase Analytics"
        copyright={{
          text: (
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={CopyrightIcon} size={14} />
              <span>2025 Phase Analytics. All rights reserved.</span>
            </span>
          ),
        }}
        email={{
          address: 'support@phase.sh',
          icon: <HugeiconsIcon icon={Mail01Icon} size={14} />,
        }}
        legalLinks={[
          {
            href: 'https://phase.sh/docs/privacy/privacy-policy',
            label: 'PRIVACY POLICY',
          },
          {
            href: 'https://phase.sh/docs/privacy/terms-of-service',
            label: 'TERMS OF SERVICE',
          },
        ]}
        logo={
          <Image
            alt="Phase Analytics"
            height={32}
            src="/typography.svg"
            width={120}
          />
        }
        mainLinks={[
          { href: '#features', label: 'FEATURES' },
          { href: '#pricing', label: 'PRICING' },
          { href: 'https://phase.sh/docs', label: 'DOCUMENTATION' },
          { href: '/dashboard', label: 'DASHBOARD' },
        ]}
        socialLinks={[
          {
            href: 'https://github.com/Phase-Analytics/Phase',
            icon: <HugeiconsIcon icon={GithubIcon} size={20} />,
            label: 'GITHUB',
          },
          {
            href: 'https://x.com/berkinory',
            icon: <HugeiconsIcon icon={NewTwitterIcon} size={20} />,
            label: 'TWITTER',
          },
        ]}
        status={{
          href: 'https://status.phase.sh',
          label: 'STATUS',
        }}
      />
    </div>
  );
}
