'use client';

import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import NumberFlow from '@number-flow/react';
import React, { type HTMLAttributes, useState } from 'react';
import { AutoHeight } from '@/components/ui/primitives/effects/auto-height';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  defaultPlan = 'starter',
  defaultInterval = 'monthly',
  className,
  containerClassName,
  buttonClassName,
  ...props
}: PricingTableProps) {
  const [isYearly, setIsYearly] = useState(defaultInterval === 'yearly');
  const [_selectedPlan, setSelectedPlan] = useState<PlanLevel>(defaultPlan);

  const handlePlanSelect = (plan: PlanLevel) => {
    setSelectedPlan(plan);
    onPlanSelect?.(plan);
  };

  return (
    <section
      className={cn(
        'bg-background text-foreground',
        'px-4 py-12 lg:py-16',
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
            Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-sm">
            Simple pricing, no hidden fees. Start for free.
          </p>
        </div>
        <div className="mb-8 flex justify-center">
          <Tabs
            defaultValue={isYearly ? 'yearly' : 'monthly'}
            onValueChange={(value) => setIsYearly(value === 'yearly')}
          >
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[600px] divide-y divide-zinc-200 dark:divide-zinc-800"
              style={{
                gridTemplateColumns: '140px repeat(3, 1fr)',
              }}
            >
              <div className="bg-zinc-50 p-4 dark:bg-zinc-900" />
              {plans.map((plan, index) => (
                <button
                  className={cn(
                    'flex flex-col items-center bg-zinc-50 p-4 transition-colors dark:bg-zinc-900',
                    index > 0 && 'border-zinc-200 border-l dark:border-zinc-800'
                  )}
                  key={plan.name}
                  onClick={() => handlePlanSelect(plan.level)}
                  type="button"
                >
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <span className="font-semibold text-base">{plan.name}</span>
                    {plan.popular && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-600 text-xs dark:bg-orange-900 dark:text-orange-300">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                      <NumberFlow
                        className="font-bold text-2xl"
                        format={{
                          style: 'currency',
                          currency: 'USD',
                          trailingZeroDisplay: 'stripIfInteger',
                        }}
                        value={
                          isYearly ? plan.price.yearly : plan.price.monthly
                        }
                      />
                      <span className="font-normal text-sm text-zinc-500">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                    <AutoHeight deps={[isYearly, plan.price.yearly]}>
                      {isYearly &&
                        (plan.price.yearly === 0 ? (
                          <span className="text-muted-foreground text-xs">
                            Free Forever
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs dark:text-green-400">
                            Save 17% vs monthly
                          </span>
                        ))}
                    </AutoHeight>
                  </div>
                </button>
              ))}

              {features.map((feature) => (
                <React.Fragment key={feature.name}>
                  <div className="whitespace-nowrap p-4 font-medium text-sm">
                    {feature.name}
                  </div>
                  {plans.map((plan, index) => (
                    <div
                      className={cn(
                        'flex items-center justify-center p-4 text-sm',
                        index > 0 &&
                          'border-zinc-200 border-l dark:border-zinc-800'
                      )}
                      key={plan.level}
                    >
                      {renderFeatureCell(feature, plan.level)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
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
