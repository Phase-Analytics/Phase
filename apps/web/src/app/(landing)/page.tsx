'use client';

import { track } from '@databuddy/sdk';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { Input } from '@/components/ui/input';
import PixelBlast from '@/components/ui/pixelblast';
import { AutoHeight } from '@/components/ui/primitives/effects/auto-height';
import { Spinner } from '@/components/ui/spinner';
import { API_URL } from '@/lib/api/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistResponse = {
  success: boolean;
  message: string;
};

type WaitlistCountResponse = {
  count: number;
};

const waitlistKeys = {
  all: ['waitlist'] as const,
  count: () => [...waitlistKeys.all, 'count'] as const,
};

function useWaitlistCount() {
  return useQuery({
    queryKey: waitlistKeys.count(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/public/waitlist/count`);
      if (!response.ok) {
        throw new Error('Failed to fetch count');
      }
      const data: WaitlistCountResponse = await response.json();
      return data.count;
    },
    staleTime: 30_000,
  });
}

function useJoinWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`${API_URL}/public/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data: WaitlistResponse = await response.json();

      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      if (!data.success) {
        throw new Error(data.message || 'Something went wrong');
      }

      return { data, email };
    },
    onSuccess: async ({ data }) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: waitlistKeys.count() });

      await track('waitlist_join', {});
    },
    onError: (error) => {
      toast.error(
        error.message || 'Failed to join waitlist. Please try again.'
      );
    },
  });
}

function WaitlistForm() {
  const joinWaitlist = useJoinWaitlist();

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      await joinWaitlist.mutateAsync(value.email);
      form.reset();
    },
  });

  return (
    <form
      aria-label="Waitlist signup form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardContent className="space-y-4">
          <form.Subscribe selector={(state) => state.submissionAttempts}>
            {(submissionAttempts) => (
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const trimmedValue = value.trim();

                    if (!trimmedValue) {
                      return 'Email is required';
                    }

                    if (!EMAIL_REGEX.test(trimmedValue)) {
                      return 'Please enter a valid email address';
                    }

                    return;
                  },
                }}
              >
                {(field) => {
                  const showErrors =
                    submissionAttempts > 0 &&
                    field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <label className="sr-only" htmlFor="waitlist-email">
                        Email
                      </label>
                      <Input
                        aria-describedby={
                          showErrors ? 'waitlist-email-error' : undefined
                        }
                        aria-invalid={showErrors}
                        autoComplete="email"
                        className="h-11 border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        id="waitlist-email"
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Enter your email"
                        type="text"
                        value={field.state.value}
                      />
                      <AutoHeight deps={[showErrors]}>
                        {showErrors && (
                          <p
                            className="text-red-400 text-sm"
                            id="waitlist-email-error"
                            role="alert"
                          >
                            {field.state.meta.errors[0]}
                          </p>
                        )}
                      </AutoHeight>
                    </div>
                  );
                }}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Subscribe
            selector={(state) =>
              [
                state.canSubmit,
                state.isSubmitting,
                state.submissionAttempts,
              ] as const
            }
          >
            {([canSubmit, isSubmitting, submissionAttempts]) => (
              <Button
                className="h-11 w-full bg-white text-black hover:bg-white/90"
                disabled={
                  (submissionAttempts > 0 && !canSubmit) ||
                  isSubmitting ||
                  joinWaitlist.isPending
                }
                type="submit"
              >
                {joinWaitlist.isPending ? (
                  <>
                    <Spinner className="mr-2" />
                    Joining...
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </Button>
            )}
          </form.Subscribe>

          <p className="text-center text-white/40 text-xs">
            We respect your privacy. No spam, ever.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

function WaitlistCount() {
  const { data: count } = useWaitlistCount();

  const displayCount = count ?? 0;

  return (
    <p className="text-sm text-white/60">
      <CountingNumber
        className="font-semibold text-white"
        number={displayCount}
      />{' '}
      {displayCount === 1 ? 'person has' : 'people have'} already joined
    </p>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 [mask-image:radial-gradient(circle_at_center,transparent_0%,transparent_25%,black_50%)]">
        <PixelBlast
          enableRipples={false}
          patternScale={5}
          pixelSize={3}
          speed={1}
        />
      </div>

      <div className="fade-in slide-in-from-bottom-4 relative z-10 flex w-full max-w-md animate-in flex-col items-center gap-8 fill-mode-both px-6 delay-300 duration-700">
        <div className="flex flex-col items-center gap-6 text-center">
          <Image
            alt="Phase Analytics Logo"
            className="h-20 w-20"
            height={80}
            priority
            src="/logo.svg"
            width={80}
          />

          <div className="space-y-3">
            <h1 className="font-bold text-4xl text-white tracking-tight sm:text-5xl">
              Phase Analytics
            </h1>
            <p className="max-w-sm text-lg text-white/70">
              Open-source mobile analytics. Privacy-first, real-time insights
              for your apps.
            </p>
          </div>
        </div>

        <div className="w-full space-y-4">
          <WaitlistForm />
          <div className="flex justify-center">
            <WaitlistCount />
          </div>
        </div>

        <a
          className="text-sm text-white/50 transition-colors hover:text-white"
          href="https://github.com/phase-analytics/Phase"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
