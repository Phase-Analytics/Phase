'use client';

import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import NumberFlow from '@number-flow/react';
import Link from 'next/link';
import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PlanLevel = 'free' | 'starter' | 'pro' | 'all' | string;

export type PricingFeature = {
  name: string;
  included: PlanLevel | null;
  values?: Record<string, string>;
};

export type PricingPlan = {
  name: string;
  level: PlanLevel;
  price: {
    monthly: number;
    yearly: number;
  };
  popular?: boolean;
  shortName?: string;
};

export interface PricingTableProps extends HTMLAttributes<HTMLDivElement> {
  features: PricingFeature[];
  plans: PricingPlan[];
  onPlanSelect?: (plan: PlanLevel) => void;
  defaultPlan?: PlanLevel;
  defaultInterval?: 'monthly' | 'yearly';
  containerClassName?: string;
  buttonClassName?: string;
}

export function PricingTable({
  features,
  plans,
  onPlanSelect,
  defaultPlan = 'pro',
  defaultInterval = 'monthly',
  className,
  containerClassName,
  buttonClassName,
  ...props
}: PricingTableProps) {
  const [isYearly, setIsYearly] = useState(defaultInterval === 'yearly');
  const [selectedPlan, setSelectedPlan] = useState<PlanLevel>(defaultPlan);

  const handlePlanSelect = (plan: PlanLevel) => {
    setSelectedPlan(plan);
    onPlanSelect?.(plan);
  };

  return (
    <section
      className={cn(
        'bg-background text-foreground',
        'px-4 py-16 sm:py-24 md:py-32',
        'fade-bottom overflow-hidden pb-0'
      )}
      id="pricing"
    >
      <div
        className={cn('mx-auto w-full max-w-5xl px-4', containerClassName)}
        {...props}
      >
        <div className="mb-8 text-center">
          <h2 className="mb-3 font-semibold text-lg text-muted-foreground uppercase">
            Pricing
          </h2>
          <p className="text-muted-foreground text-sm">
            Simple pricing, no hidden fees. Start for free.
          </p>
        </div>
        <div className="mb-4 flex justify-end sm:mb-8">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm">
            <button
              className={cn(
                'rounded-md px-3 py-1 transition-colors',
                isYearly ? 'text-zinc-500' : 'bg-zinc-100 dark:bg-zinc-800'
              )}
              onClick={() => setIsYearly(false)}
              type="button"
            >
              Monthly
            </button>
            <button
              className={cn(
                'rounded-md px-3 py-1 transition-colors',
                isYearly ? 'bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-500'
              )}
              onClick={() => setIsYearly(true)}
              type="button"
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          {plans.map((plan) => (
            <button
              className={cn(
                'flex-1 rounded-xl p-4 text-left transition-all',
                'border border-zinc-200 dark:border-zinc-800',
                selectedPlan === plan.level &&
                  'ring-2 ring-orange-500 dark:ring-orange-400'
              )}
              key={plan.name}
              onClick={() => handlePlanSelect(plan.level)}
              type="button"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-sm">{plan.name}</span>
                {plan.popular && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-600 text-xs dark:bg-orange-900 dark:text-orange-300">
                    Popular
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <NumberFlow
                  className="font-bold text-2xl"
                  format={{
                    style: 'currency',
                    currency: 'USD',
                    trailingZeroDisplay: 'stripIfInteger',
                  }}
                  value={isYearly ? plan.price.yearly : plan.price.monthly}
                />
                <span className="font-normal text-sm text-zinc-500">
                  /{isYearly ? 'year' : 'month'}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <div className="min-w-[640px] divide-y divide-zinc-200 dark:divide-zinc-800">
              <div className="flex items-center bg-zinc-50 p-4 dark:bg-zinc-900">
                <div className="flex-1 font-medium text-sm">Features</div>
                <div className="flex items-center gap-8 text-sm">
                  {plans.map((plan) => (
                    <div
                      className="w-24 text-center font-medium"
                      key={plan.level}
                    >
                      {plan.shortName ?? plan.name}
                    </div>
                  ))}
                </div>
              </div>
              {features.map((feature) => (
                <div
                  className={cn('flex items-center p-4 transition-colors')}
                  key={feature.name}
                >
                  <div className="flex-1 text-sm">{feature.name}</div>
                  <div className="flex items-center gap-8 text-sm">
                    {plans.map((plan) => (
                      <div
                        className={cn(
                          'flex w-24 justify-center',
                          plan.level === selectedPlan && 'font-medium'
                        )}
                        key={plan.level}
                      >
                        {renderFeatureCell(feature, plan.level)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/dashboard">
            <Button
              className={cn(
                'group relative w-full cursor-pointer overflow-hidden sm:w-auto',
                buttonClassName
              )}
              size="lg"
            >
              <span className="relative z-10 font-bold text-md">
                Get started with{' '}
                {plans.find((p) => p.level === selectedPlan)?.name}
              </span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function renderFeatureCell(feature: PricingFeature, planLevel: string) {
  if (feature.values?.[planLevel]) {
    return <span className="text-xs">{feature.values[planLevel]}</span>;
  }

  if (shouldShowCheck(feature.included, planLevel)) {
    return (
      <HugeiconsIcon className="text-orange-500" icon={Tick02Icon} size={20} />
    );
  }

  return <span className="text-zinc-300 dark:text-zinc-700">-</span>;
}

function shouldShowCheck(
  included: PricingFeature['included'],
  level: string
): boolean {
  if (included === 'all') {
    return true;
  }
  if (included === 'pro' && (level === 'pro' || level === 'all')) {
    return true;
  }
  if (
    included === 'starter' &&
    (level === 'starter' || level === 'pro' || level === 'all')
  ) {
    return true;
  }
  if (
    included === 'free' &&
    (level === 'free' ||
      level === 'starter' ||
      level === 'pro' ||
      level === 'all')
  ) {
    return true;
  }
  return false;
}
