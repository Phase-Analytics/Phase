'use client';

import type { CheckedState } from '@radix-ui/react-checkbox';
import { useState } from 'react';
import { ThemeTogglerButton } from '@/components/theme-toggler';
import { AnimatedTabs } from '@/components/ui/animated-tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Page() {
  const [checked, setChecked] = useState<CheckedState>(false);
  const [switchChecked, setSwitchChecked] = useState(false);

  return (
    <div className="min-h-screen bg-main-background p-8">
      <div className="mx-auto max-w-7xl space-y-16">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-4xl text-primary">
            Component Showcase
          </h1>
          <ThemeTogglerButton />
        </div>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Buttons
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="button" variant="default">
              Default
            </Button>
            <Button type="button" variant="outline">
              Outline
            </Button>
            <Button type="button" variant="success">
              Success
            </Button>
            <Button type="button" variant="destructive">
              Destructive
            </Button>
            <Button type="button" variant="shine">
              Shine
            </Button>
            <Button type="button" variant="animated-border">
              Animated Border
            </Button>
            <Button type="button" variant="rotate-border">
              Rotate Border
            </Button>
            <Button type="button" variant="glitch-brightness">
              Glitch Brightness
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button isMagnetic type="button" variant="default">
              Magnetic Default
            </Button>
            <Button isMagnetic type="button" variant="outline">
              Magnetic Outline
            </Button>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Badges
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="shine">Shine</Badge>
            <Badge variant="animated-border">Animated Border</Badge>
            <Badge variant="rotate-border">Rotate Border</Badge>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Cards
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card variant="default">
              <h3 className="mb-2 font-semibold text-lg text-primary-foreground">
                Default Card
              </h3>
              <p className="text-primary-muted text-sm">
                This is a default card variant with standard styling.
              </p>
            </Card>
            <Card variant="animated-border">
              <h3 className="mb-2 font-semibold text-lg text-primary-foreground">
                Animated Border
              </h3>
              <p className="text-primary-muted text-sm">
                This card has an animated border effect.
              </p>
            </Card>
            <Card variant="shine">
              <h3 className="mb-2 font-semibold text-lg text-primary-foreground">
                Shine Card
              </h3>
              <p className="text-primary-muted text-sm">
                This card has a shine animation effect.
              </p>
            </Card>
            <Card variant="revealed-pointer">
              <h3 className="mb-2 font-semibold text-lg text-primary-foreground">
                Revealed Pointer
              </h3>
              <p className="text-primary-muted text-sm">
                Hover over this card to see the pointer reveal effect.
              </p>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Text Effects
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <Text variant="shine">Shining Text Effect</Text>
            </div>
            <div>
              <Text variant="generate-effect">Generated Text Animation</Text>
            </div>
            <div>
              <Text variant="glitch">Hover for Glitch Effect</Text>
            </div>
            <div>
              <Text variant="hover-enter">Hover Enter Animation</Text>
            </div>
            <div>
              <Text variant="shake">Shake on Hover</Text>
            </div>
            <div>
              <Text variant="hover-decoration">Underline on Hover</Text>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Form Elements
          </h2>
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <label
                className="font-medium text-primary-foreground text-sm"
                htmlFor="input-demo"
              >
                Input Field
              </label>
              <Input id="input-demo" placeholder="Enter your text here" />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={checked}
                id="checkbox-demo"
                onCheckedChange={setChecked}
              />
              <label
                className="cursor-pointer text-primary-foreground text-sm"
                htmlFor="checkbox-demo"
              >
                Checkbox with animation
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={switchChecked}
                id="switch-demo"
                onCheckedChange={setSwitchChecked}
              />
              <label
                className="cursor-pointer text-primary-foreground text-sm"
                htmlFor="switch-demo"
              >
                Toggle Switch
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Avatars
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar>
              <AvatarImage alt="Avatar" src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar hasBorder>
              <AvatarImage
                alt="Avatar with border"
                src="https://github.com/shadcn.png"
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar hasBorder>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Animated Tabs
          </h2>
          <AnimatedTabs tabs={['Home', 'Products', 'Services', 'About']} />
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Dialog
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="default">
                Open Dialog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>
                This is a dialog description. You can add any content here to
                inform users about the dialog purpose.
              </DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" variant="default">
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Tooltip
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline">
                  Hover for tooltip
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a tooltip with helpful information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </section>

        <section className="space-y-6">
          <h2 className="font-semibold text-2xl text-primary-foreground">
            Dropdown Menu
          </h2>
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                icon={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <title>Settings</title>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6m-6-6h6m6 0h6" />
                  </svg>
                }
                iconOpen={
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <title>Close</title>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                }
              >
                Settings
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup title="Account">
                  <DropdownMenuItem shortcut="⌘K" type="button">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <title>User</title>
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem shortcut="⌘B" type="button">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <title>Credit Card</title>
                      <rect height="16" rx="2" width="20" x="2" y="4" />
                      <path d="M2 10h20" />
                    </svg>
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem shortcut="⌘S" type="button">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <title>Settings</title>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6m0 6v6" />
                    </svg>
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup title="Team">
                  <DropdownMenuItem type="button">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <title>Users</title>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Team Members
                  </DropdownMenuItem>
                  <DropdownMenuItem shortcut="⌘I" type="button">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <title>User Plus</title>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 11h-6m3-3v6" />
                    </svg>
                    Invite
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-red-500 hover:text-red-600 focus-visible:text-red-600"
                  shortcut="⇧⌘Q"
                  type="button"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <title>Log Out</title>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <path d="M21 12H9" />
                  </svg>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger>No Icon</DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem type="button">Simple Item</DropdownMenuItem>
                <DropdownMenuItem type="button">Another Item</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>
      </div>
    </div>
  );
}
