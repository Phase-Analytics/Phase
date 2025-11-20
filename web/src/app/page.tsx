'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ThemeTogglerButton } from '@/components/theme-toggler';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Code, CodeBlock, CodeHeader } from '@/components/ui/code';
import { CodeTabs } from '@/components/ui/code-tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { Cursor, CursorFollow, CursorProvider } from '@/components/ui/cursor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TypingText, TypingTextCursor } from '@/components/ui/typing-text';

export default function Page() {
  const [progress, setProgress] = useState(65);
  const [checked, setChecked] = useState(false);
  const [switched, setSwitched] = useState(false);

  return (
    <div className="min-h-screen bg-main-background p-8">
      <div className="mx-auto max-w-7xl space-y-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-4xl">
              <ShimmeringText text="UI Components Showcase" />
            </h1>
            <p className="mt-2 text-muted-foreground">
              <TypingText
                text={['Design System', 'Component Library', 'Beautiful UI']}
              >
                <TypingTextCursor />
              </TypingText>
            </p>
          </div>
          <ThemeTogglerButton />
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="shine">Shine</Button>
            <Button variant="gradient-primary">Gradient Primary</Button>
            <Button variant="gradient-destructive">Gradient</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled>
              <Loading size="sm" variant="button" />
              Creating...
            </Button>
            <Button disabled variant="outline">
              <Loading size="sm" variant="button" />
              Loading...
            </Button>
            <Button disabled variant="success">
              <Loading size="sm" variant="button" />
              Processing...
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover Me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a tooltip</p>
              </TooltipContent>
            </Tooltip>

            <CopyButton content="Hello from clipboard!" variant="outline" />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Dialogs & Dropdowns</h2>
          <div className="flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="default">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Welcome to Telemetra</DialogTitle>
                  <DialogDescription>
                    This is a beautiful dialog component with smooth animations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input placeholder="Enter your name..." />
                  <Input placeholder="Enter your email..." type="email" />
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={checked}
                  onCheckedChange={setChecked}
                >
                  Enable notifications
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="accent">Open Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <h4 className="font-medium">Popover Title</h4>
                  <p className="text-muted-foreground text-sm">
                    This is a popover with custom content.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Forms & Inputs</h2>
          <div className="grid max-w-2xl gap-6">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="email-input">
                Email Input
              </label>
              <Input
                id="email-input"
                placeholder="your@email.com"
                type="email"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={checked}
                id="terms"
                onCheckedChange={(value) => setChecked(value === true)}
              />
              <label className="cursor-pointer text-sm" htmlFor="terms">
                I agree to the terms and conditions
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={switched}
                id="dark-mode-switch"
                onCheckedChange={setSwitched}
              />
              <label className="text-sm" htmlFor="dark-mode-switch">
                Enable dark mode features
              </label>
            </div>

            <div className="space-y-2">
              <span className="font-medium text-sm">Progress: {progress}%</span>
              <Progress value={progress} />
              <div className="flex gap-2">
                <Button
                  className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-xs"
                  onClick={() => setProgress(Math.max(0, progress - 10))}
                >
                  Decrease
                </Button>
                <Button
                  className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-xs"
                  onClick={() => setProgress(Math.min(100, progress + 10))}
                >
                  Increase
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Tabs</h2>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Overview</TabsTrigger>
              <TabsTrigger value="tab2">Analytics</TabsTrigger>
              <TabsTrigger value="tab3">Reports</TabsTrigger>
            </TabsList>
            <TabsContents>
              <TabsContent value="tab1">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-2 font-semibold">Overview Content</h3>
                  <p className="text-muted-foreground text-sm">
                    This is the overview tab with important metrics and
                    information.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="tab2">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-2 font-semibold">Analytics Content</h3>
                  <p className="text-muted-foreground text-sm">
                    View your analytics and performance metrics here.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="tab3">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="mb-2 font-semibold">Reports Content</h3>
                  <p className="text-muted-foreground text-sm">
                    Generate and download detailed reports.
                  </p>
                </div>
              </TabsContent>
            </TabsContents>
          </Tabs>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Accordion</h2>
          <Accordion className="max-w-2xl" collapsible type="single">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is Telemetra?</AccordionTrigger>
              <AccordionContent>
                Telemetra is a powerful analytics platform that helps you
                understand your users and make data-driven decisions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How does it work?</AccordionTrigger>
              <AccordionContent>
                It collects, processes, and visualizes data in real-time,
                providing you with actionable insights through beautiful
                dashboards.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is it secure?</AccordionTrigger>
              <AccordionContent>
                Yes, we use industry-standard encryption and security practices
                to protect your data at all times.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Code Display</h2>

          <div className="space-y-4">
            <Code code="const greeting = 'Hello, World!';\nconsole.log(greeting);">
              <CodeHeader copyButton>example.ts</CodeHeader>
              <CodeBlock cursor lang="typescript" />
            </Code>

            <CodeTabs
              codes={{
                npm: 'npm install telemetra',
                yarn: 'yarn add telemetra',
                pnpm: 'pnpm add telemetra',
                bun: 'bun add telemetra',
              }}
              lang="bash"
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Custom Cursor</h2>
          <CursorProvider
            className="rounded-lg border bg-linear-to-br from-primary/10 to-accent/10 p-12"
            global={false}
          >
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Move your cursor around this area to see the custom cursor
                effect
              </p>
              <Cursor />
              <CursorFollow>
                <span>Custom Cursor</span>
              </CursorFollow>
            </div>
          </CursorProvider>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Cards</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Simple Card</CardTitle>
                <CardDescription>
                  A basic card with title and description
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This is a simple card component that can contain any content.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card with Badge</CardTitle>
                <CardDescription>
                  This card includes badges for status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>New</Badge>
                  <Badge variant="success">Active</Badge>
                  <Badge variant="outline">Featured</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Badges help categorize and highlight important information.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>With action button</CardDescription>
                <CardAction>
                  <Badge variant="animated-border">Live</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  Cards can include interactive elements and actions.
                </p>
                <Button className="w-full" size="sm" variant="outline">
                  View Details
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Card</CardTitle>
                <CardDescription>System metrics</CardDescription>
                <CardAction>
                  <Badge variant="success">Online</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-medium">72%</span>
                  </div>
                  <Progress value={72} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Card</CardTitle>
                <CardDescription>Premium subscription</CardDescription>
                <CardAction>
                  <Badge variant="rotate-border">Hot</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-3xl">$29</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="success">✓</Badge>
                    <span>Unlimited projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="success">✓</Badge>
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" variant="gradient-primary">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Card</CardTitle>
                <CardDescription>Recent activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="shine">New</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">New message received</p>
                    <p className="text-muted-foreground text-xs">
                      2 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline">Info</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      System update available
                    </p>
                    <p className="text-muted-foreground text-xs">1 hour ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="shine">Shine</Badge>
            <Badge variant="animated-border">Animated Border</Badge>
            <Badge variant="rotate-border">Rotate Border</Badge>
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Badge Combinations</CardTitle>
              <CardDescription>
                Badges work great in different contexts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium text-sm">Status Indicators:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Completed</Badge>
                  <Badge variant="shine">In Progress</Badge>
                  <Badge variant="outline">Pending</Badge>
                  <Badge variant="destructive">Failed</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium text-sm">Category Tags:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Design</Badge>
                  <Badge variant="outline">Development</Badge>
                  <Badge variant="outline">Marketing</Badge>
                  <Badge variant="outline">Sales</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium text-sm">Animated Badges:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="animated-border">Premium</Badge>
                  <Badge variant="rotate-border">Exclusive</Badge>
                  <Badge variant="shine">Featured</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Avatars</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">With Image</p>
              <div className="flex gap-2">
                <Avatar>
                  <AvatarImage
                    alt="User 1"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  />
                  <AvatarFallback>U1</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage
                    alt="User 2"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka"
                  />
                  <AvatarFallback>U2</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage
                    alt="User 3"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Luna"
                  />
                  <AvatarFallback>U3</AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Fallback</p>
              <div className="flex gap-2">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>CD</AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Sizes</p>
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarImage
                    alt="Small"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Small"
                  />
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <Avatar className="size-8">
                  <AvatarImage
                    alt="Default"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Default"
                  />
                  <AvatarFallback>MD</AvatarFallback>
                </Avatar>
                <Avatar className="size-12">
                  <AvatarImage
                    alt="Large"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Large"
                  />
                  <AvatarFallback>LG</AvatarFallback>
                </Avatar>
                <Avatar className="size-16">
                  <AvatarImage
                    alt="Extra Large"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=XLarge"
                  />
                  <AvatarFallback>XL</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Avatar with User Info</CardTitle>
              <CardDescription>Profile card example</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarImage
                    alt="Profile"
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Profile"
                  />
                  <AvatarFallback>PR</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">John Doe</h3>
                  <p className="text-muted-foreground text-sm">
                    john.doe@example.com
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline">Developer</Badge>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Scroll Area</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vertical Scroll</CardTitle>
                <CardDescription>Scrollable content area</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full rounded-md border p-4">
                  <div className="space-y-4">
                    {Array.from({ length: 20 }, (_, i) => `item-${i}`).map(
                      (id, i) => (
                        <div
                          className="flex items-center gap-3 rounded-lg border bg-card p-3"
                          key={id}
                        >
                          <Avatar className="size-10">
                            <AvatarImage
                              alt={`User ${i + 1}`}
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`}
                            />
                            <AvatarFallback>U{i + 1}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">Item {i + 1}</p>
                            <p className="text-muted-foreground text-xs">
                              Description for item {i + 1}
                            </p>
                          </div>
                          <Badge variant="outline">{i + 1}</Badge>
                        </div>
                      )
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Code Preview</CardTitle>
                <CardDescription>Scrollable code block</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full rounded-md border">
                  <div className="p-4">
                    <pre className="text-sm">
                      <code>{`function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  return (
    <div className="container">
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  );
}

export default Example;`}</code>
                    </pre>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Loading States</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loading</CardTitle>
                <CardDescription>Placeholder for content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spinner Loading</CardTitle>
                <CardDescription>Animated loading indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Spinner className="size-4" />
                  <span className="text-sm">Small spinner</span>
                </div>
                <div className="flex items-center gap-4">
                  <Spinner className="size-6" />
                  <span className="text-sm">Medium spinner</span>
                </div>
                <div className="flex items-center gap-4">
                  <Spinner className="size-8" />
                  <span className="text-sm">Large spinner</span>
                </div>
                <Separator />
                <div className="flex items-center justify-center gap-3 rounded-lg border bg-accent/50 p-8">
                  <Spinner className="size-6" />
                  <span className="text-sm">Loading content...</span>
                </div>
                <Button className="w-full" disabled>
                  <Spinner className="mr-2 size-4" />
                  Loading...
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Toast Notifications</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Toast Variants</CardTitle>
                <CardDescription>
                  Different types of toast notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() =>
                    toast.success('Success! Your changes have been saved.')
                  }
                  variant="outline"
                >
                  Show Success Toast
                </Button>
                <Button
                  className="w-full"
                  onClick={() => toast.error('Error! Something went wrong.')}
                  variant="outline"
                >
                  Show Error Toast
                </Button>
                <Button
                  className="w-full"
                  onClick={() =>
                    toast.info('Info: Here is some information for you.')
                  }
                  variant="outline"
                >
                  Show Info Toast
                </Button>
                <Button
                  className="w-full"
                  onClick={() =>
                    toast.warning('Warning! Please check your input.')
                  }
                  variant="outline"
                >
                  Show Warning Toast
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Toast with Actions</CardTitle>
                <CardDescription>Interactive toast messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() =>
                    toast('Event has been created', {
                      description: 'Sunday, December 03, 2023 at 9:00 AM',
                      action: {
                        label: 'Undo',
                        onClick: () => console.log('Undo'),
                      },
                    })
                  }
                  variant="outline"
                >
                  Toast with Action
                </Button>
                <Button
                  className="w-full"
                  onClick={() =>
                    toast.promise(
                      new Promise((resolve) => setTimeout(resolve, 2000)),
                      {
                        loading: 'Loading...',
                        success: 'Data loaded successfully!',
                        error: 'Failed to load data.',
                      }
                    )
                  }
                  variant="outline"
                >
                  Promise Toast
                </Button>
                <Button
                  className="w-full"
                  onClick={() =>
                    toast('Custom styled toast', {
                      description: 'This toast has a custom duration',
                      duration: 5000,
                    })
                  }
                  variant="outline"
                >
                  Custom Duration (5s)
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-semibold text-2xl">Dot Loading</h2>
          <Card>
            <CardHeader>
              <CardTitle>Loading Animation</CardTitle>
              <CardDescription>
                Pulse & fill combination - center to edge and back
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center justify-center py-8">
                <Loading />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
