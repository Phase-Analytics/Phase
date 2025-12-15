'use client';

import { useState } from 'react';
import { ulid } from 'ulid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/lib/api/client';

const EVENT_NAMES = [
  'button_clicked',
  'page_viewed',
  'item_added_to_cart',
  'checkout_started',
  'purchase_completed',
  'user_logged_in',
  'search_performed',
  'video_played',
  'form_submitted',
  'error_occurred',
];

type LogEntry = {
  type: 'info' | 'success' | 'error';
  message: string;
  timestamp: Date;
};

export default function TestPage() {
  const [apiKey, setApiKey] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: new Date() }]);
  };

  const sendRandomEvents = async () => {
    if (!apiKey.trim()) {
      addLog('error', 'Please enter an API key');
      return;
    }

    setIsLoading(true);
    setLogs([]);

    try {
      const deviceId = ulid();
      const sessionId = ulid();
      const now = new Date();

      const platforms = ['ios', 'android', 'web'] as const;
      const platform = platforms[Math.floor(Math.random() * platforms.length)];

      let osVersion: string;
      let model: string;

      if (platform === 'ios') {
        osVersion = `${Math.floor(Math.random() * 3) + 16}.${Math.floor(Math.random() * 5)}`;
        const models = ['iPhone 15 Pro', 'iPhone 14', 'iPhone 13', 'iPad Pro'];
        model = models[Math.floor(Math.random() * models.length)];
      } else if (platform === 'android') {
        osVersion = `${Math.floor(Math.random() * 3) + 12}.${Math.floor(Math.random() * 5)}`;
        const models = [
          'Samsung Galaxy S23',
          'Google Pixel 8',
          'OnePlus 11',
          'Xiaomi 13',
        ];
        model = models[Math.floor(Math.random() * models.length)];
      } else {
        osVersion = '1.0.0';
        model = 'Web Browser';
      }

      addLog('info', `Generated Device ID: ${deviceId}`);
      addLog('info', `Generated Session ID: ${sessionId}`);
      addLog(
        'info',
        `Platform: ${platform}, OS: ${osVersion}, Model: ${model}`
      );

      addLog('info', 'Creating device...');
      const deviceResponse = await fetch(`${API_URL}/sdk/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          deviceId,
          model,
          osVersion,
          platform,
          appVersion: '1.0.0',
        }),
      });

      if (!deviceResponse.ok) {
        const error = await deviceResponse.json();
        throw new Error(
          `Device creation failed: ${error.detail || deviceResponse.statusText}`
        );
      }

      const device = await deviceResponse.json();
      addLog('success', `Device created: ${device.deviceId}`);

      addLog('info', 'Creating session...');
      const sessionResponse = await fetch(`${API_URL}/sdk/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          sessionId,
          deviceId,
          startedAt: now.toISOString(),
          appVersion: '1.0.0',
        }),
      });

      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        throw new Error(
          `Session creation failed: ${error.detail || sessionResponse.statusText}`
        );
      }

      const session = await sessionResponse.json();
      addLog('success', `Session created: ${session.sessionId}`);

      const sessionDelay = Math.random() * 1000 + 500;
      addLog(
        'info',
        `Waiting ${(sessionDelay / 1000).toFixed(2)}s before sending events...`
      );
      await new Promise((resolve) => setTimeout(resolve, sessionDelay));

      const eventCount = 15;
      addLog('info', `Sending ${eventCount} random events...`);

      let cumulativeTime = sessionDelay;
      for (let i = 0; i < eventCount; i++) {
        const eventDelay = Math.random() * 1000 + 500;
        cumulativeTime += eventDelay;

        const eventName =
          EVENT_NAMES[Math.floor(Math.random() * EVENT_NAMES.length)];
        const eventTimestamp = new Date(now.getTime() + cumulativeTime);

        const eventResponse = await fetch(`${API_URL}/sdk/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            sessionId,
            name: eventName,
            params: {
              test: true,
              index: i + 1,
              randomValue: Math.random(),
            },
            timestamp: eventTimestamp.toISOString(),
          }),
        });

        if (!eventResponse.ok) {
          const error = await eventResponse.json();
          throw new Error(
            `Event ${i + 1} failed: ${error.detail || eventResponse.statusText}`
          );
        }

        const event = await eventResponse.json();
        addLog(
          'success',
          `Event ${i + 1}/${eventCount} sent: ${event.name} (${event.eventId})`
        );

        await new Promise((resolve) => setTimeout(resolve, eventDelay));
      }

      addLog('success', '✓ All operations completed successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      addLog('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl">API Test Page</h1>
        <p className="text-muted-foreground text-sm">
          Test device, session, and event creation
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="apiKey">
            API Key
          </label>
          <Input
            id="apiKey"
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            type="password"
            value={apiKey}
          />
        </div>

        <Button
          disabled={isLoading || !apiKey.trim()}
          onClick={sendRandomEvents}
        >
          {isLoading ? 'Processing...' : 'Send Random Events'}
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Logs</h2>
          <div className="space-y-1 rounded-lg border bg-muted/50 p-4 font-mono text-sm">
            {logs.map((log, index) => {
              let logClass = 'text-muted-foreground';
              if (log.type === 'error') {
                logClass = 'text-destructive';
              } else if (log.type === 'success') {
                logClass = 'text-green-600 dark:text-green-400';
              }

              return (
                <div
                  className={logClass}
                  key={`${log.timestamp.getTime()}-${index}`}
                >
                  <span className="text-muted-foreground text-xs">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>{' '}
                  {log.message}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
