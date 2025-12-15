'use client';

import {
  AndroidIcon,
  AppleIcon,
  ComputerPhoneSyncIcon,
  FullSignalIcon,
  GpsSignal01Icon,
  PauseIcon,
  PlayIcon,
  PlugSocketIcon,
  WifiError02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MusicPlayer } from './music-player';

type RealtimeHeaderProps = {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  onlineUsers?: number;
  platforms?: {
    ios?: number;
    android?: number;
  };
  onPause?: () => void;
  onResume?: () => void;
  appName?: string;
};

function getStatusInfo(
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
): {
  icon: typeof FullSignalIcon;
  color: string;
  label: string;
} {
  if (status === 'connected') {
    return {
      icon: FullSignalIcon,
      color: 'text-success',
      label: 'Connected',
    };
  }

  if (status === 'connecting') {
    return {
      icon: WifiError02Icon,
      color: 'text-yellow-500',
      label: 'Connecting',
    };
  }

  return {
    icon: PlugSocketIcon,
    color: 'text-destructive',
    label: status === 'error' ? 'Connection Error' : 'Disconnected',
  };
}

export function RealtimeHeader({
  status,
  onlineUsers = 0,
  platforms = {},
  onPause,
  onResume,
  appName,
}: RealtimeHeaderProps) {
  const statusInfo = getStatusInfo(status);

  const platformData = [
    { key: 'ios', label: 'iOS', icon: AppleIcon, value: platforms.ios || 0 },
    {
      key: 'android',
      label: 'Android',
      icon: AndroidIcon,
      value: platforms.android || 0,
    },
  ].filter((p) => p.value > 0);

  return (
    <Card className="w-fit min-w-[370px] py-4">
      <CardContent className="flex w-full flex-col gap-3 space-y-0 px-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={GpsSignal01Icon}
            />
            <span className="font-medium text-sm">{appName || 'Realtime'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge className="flex items-center gap-1.5" variant="outline">
              <HugeiconsIcon
                className={`size-3.5 ${statusInfo.color}`}
                icon={statusInfo.icon}
              />
              <span className="text-muted-foreground text-sm">
                {statusInfo.label}
              </span>
            </Badge>
            {(status === 'connected' || status === 'connecting') && onPause && (
              <Button
                className="size-7"
                onClick={onPause}
                size="icon"
                variant="outline"
              >
                <HugeiconsIcon
                  className="size-4 text-destructive"
                  icon={PauseIcon}
                />
              </Button>
            )}
            {(status === 'disconnected' || status === 'error') && onResume && (
              <Button
                className="size-7"
                onClick={onResume}
                size="icon"
                variant="outline"
              >
                <HugeiconsIcon
                  className="size-4 text-success"
                  icon={PlayIcon}
                />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </div>
            <span className="font-medium text-sm">
              <CountingNumber number={onlineUsers} />
            </span>
            <span className="text-muted-foreground text-sm">Online</span>
          </div>

          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={ComputerPhoneSyncIcon}
            />
            <span className="text-muted-foreground text-sm">Platforms </span>
            {platformData.length > 0 && (
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  {platformData.map((platform) => (
                    <Tooltip key={platform.key}>
                      <TooltipTrigger asChild>
                        <Badge className="h-6 px-2 py-0" variant="outline">
                          <div className="flex items-center gap-1">
                            <HugeiconsIcon
                              className="size-3.5 text-muted-foreground"
                              icon={platform.icon}
                            />
                            <span className="text-sm">{platform.value}</span>
                          </div>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{platform.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>

        <MusicPlayer />
      </CardContent>
    </Card>
  );
}
