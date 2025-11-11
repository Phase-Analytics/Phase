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
  DropdownMenuItem,
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
              <Button type="button" variant="outline">
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
          <DropdownMenu>
            <DropdownMenuTrigger>Settings</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem type="button">Profile</DropdownMenuItem>
              <DropdownMenuItem type="button">Preferences</DropdownMenuItem>
              <DropdownMenuItem type="button">Billing</DropdownMenuItem>
              <DropdownMenuItem type="button">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>
      </div>
    </div>
  );
}
