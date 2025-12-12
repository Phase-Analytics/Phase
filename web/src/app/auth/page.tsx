'use client';

import { GithubIcon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PixelBlast from '@/components/ui/pixelblast';
import { AutoHeight } from '@/components/ui/primitives/effects/auto-height';
import { Spinner } from '@/components/ui/spinner';
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { authClient } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      try {
        await authClient.signIn.email(
          {
            email: value.email,
            password: value.password,
            rememberMe: true,
            callbackURL: '/dashboard',
          },
          {
            onError: (ctx) => {
              toast.error(ctx.error.message || 'Invalid email or password');
            },
          }
        );
      } catch (error) {
        console.error('Login failed:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Card>
        <CardContent className="space-y-4">
          <form.Subscribe selector={(state) => state.submissionAttempts}>
            {(submissionAttempts) => (
              <>
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
                        <label
                          className="font-medium text-sm"
                          htmlFor="login-email"
                        >
                          Email
                        </label>
                        <Input
                          autoComplete="email"
                          id="login-email"
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="you@example.com"
                          type="text"
                          value={field.state.value}
                        />
                        <AutoHeight deps={[showErrors]}>
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                        </AutoHeight>
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="password"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) {
                        return 'Password is required';
                      }

                      if (value.length < 8) {
                        return 'Password must be at least 8 characters';
                      }

                      if (value.length > 64) {
                        return 'Password must be at most 64 characters';
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
                        <label
                          className="font-medium text-sm"
                          htmlFor="login-password"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            autoComplete="current-password"
                            className="pr-10"
                            id="login-password"
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="••••••••"
                            type={showPassword ? 'text' : 'password'}
                            value={field.state.value}
                          />
                          <button
                            className="absolute top-0 right-0 flex h-full items-center px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                          >
                            <HugeiconsIcon
                              className="size-4 text-muted-foreground"
                              icon={showPassword ? ViewOffIcon : ViewIcon}
                            />
                          </button>
                        </div>
                        <AutoHeight deps={[showErrors]}>
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                        </AutoHeight>
                      </div>
                    );
                  }}
                </form.Field>
              </>
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
                className="w-full"
                disabled={
                  (submissionAttempts > 0 && !canSubmit) ||
                  isSubmitting ||
                  isLoading
                }
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Logging in
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            )}
          </form.Subscribe>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button className="w-full" type="button" variant="outline">
            <HugeiconsIcon className="mr-2 h-4 w-4" icon={GithubIcon} />
            Sign in with Github
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      try {
        await authClient.signUp.email(
          {
            name: value.name,
            email: value.email,
            password: value.password,
            callbackURL: '/dashboard',
          },
          {
            onError: (ctx) => {
              toast.error(ctx.error.message || 'Could not create account');
            },
          }
        );
      } catch (error) {
        console.error('Signup failed:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Card>
        <CardContent className="space-y-4">
          <form.Subscribe selector={(state) => state.submissionAttempts}>
            {(submissionAttempts) => (
              <>
                <form.Field
                  name="name"
                  validators={{
                    onChange: ({ value }) => {
                      const trimmedValue = value.trim();

                      if (!trimmedValue) {
                        return 'Name is required';
                      }

                      if (trimmedValue.length < 2) {
                        return 'Name must be at least 2 characters';
                      }

                      if (trimmedValue.length > 14) {
                        return 'Name must be at most 14 characters';
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
                        <label
                          className="font-medium text-sm"
                          htmlFor="signup-name"
                        >
                          Name
                        </label>
                        <Input
                          autoComplete="name"
                          id="signup-name"
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="John Doe"
                          type="text"
                          value={field.state.value}
                        />
                        <AutoHeight deps={[showErrors]}>
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                        </AutoHeight>
                      </div>
                    );
                  }}
                </form.Field>

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
                        <label
                          className="font-medium text-sm"
                          htmlFor="signup-email"
                        >
                          Email
                        </label>
                        <Input
                          autoComplete="email"
                          id="signup-email"
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="you@example.com"
                          type="text"
                          value={field.state.value}
                        />
                        <AutoHeight deps={[showErrors]}>
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                        </AutoHeight>
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="password"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) {
                        return 'Password is required';
                      }

                      if (value.length < 8) {
                        return 'Password must be at least 8 characters';
                      }

                      if (value.length > 64) {
                        return 'Password must be at most 64 characters';
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
                        <label
                          className="font-medium text-sm"
                          htmlFor="signup-password"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            autoComplete="new-password"
                            className="pr-10"
                            id="signup-password"
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="••••••••"
                            type={showPassword ? 'text' : 'password'}
                            value={field.state.value}
                          />
                          <button
                            className="absolute top-0 right-0 flex h-full items-center px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                          >
                            <HugeiconsIcon
                              className="size-4 text-muted-foreground"
                              icon={showPassword ? ViewOffIcon : ViewIcon}
                            />
                          </button>
                        </div>
                        <AutoHeight deps={[showErrors]}>
                          {showErrors && (
                            <p className="text-destructive text-sm">
                              {field.state.meta.errors[0]}
                            </p>
                          )}
                        </AutoHeight>
                      </div>
                    );
                  }}
                </form.Field>
              </>
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
                className="w-full"
                disabled={
                  (submissionAttempts > 0 && !canSubmit) ||
                  isSubmitting ||
                  isLoading
                }
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Signing up
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            )}
          </form.Subscribe>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button className="w-full" type="button" variant="outline">
            <HugeiconsIcon className="mr-2 h-4 w-4" icon={GithubIcon} />
            Sign up with Github
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

export default function AuthPage() {
  return (
    <div className="flex h-screen w-full">
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="flex w-full max-w-md flex-col items-center gap-6 px-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
              <span className="font-bold text-2xl text-primary">T</span>
            </div>
            <h1 className="text-center font-semibold text-2xl">
              Welcome Back!
            </h1>
          </div>

          <Tabs className="w-full" defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="login">
                Login
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="signup">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContents>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <SignupForm />
                  <p className="text-center text-muted-foreground text-xs">
                    By signing up you agree to{' '}
                    <a
                      className="underline hover:text-foreground"
                      href="/terms"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Terms of Service
                    </a>{' '}
                    &{' '}
                    <a
                      className="underline hover:text-foreground"
                      href="/privacy"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </TabsContent>
            </TabsContents>
          </Tabs>
        </div>
      </div>

      <div className="pointer-events-none fixed top-0 right-0 hidden h-screen w-[70%] lg:block">
        <div className="h-full w-full [mask-image:linear-gradient(to_right,black_35%,black_100%)]">
          <PixelBlast
            enableRipples={false}
            patternScale={5}
            pixelSize={3}
            speed={1}
          />
        </div>
      </div>
    </div>
  );
}
