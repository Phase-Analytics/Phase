import type {
  OnlineUsers,
  RealtimeDevice,
  RealtimeEvent,
  RealtimeMessage,
  RealtimeSession,
} from '@/schemas';
import { getOnlineUsers } from './online-tracker';

type RealtimeBuffer = {
  events: RealtimeEvent[];
  sessions: RealtimeSession[];
  devices: RealtimeDevice[];
};

type SSESendFunction = (data: RealtimeMessage) => void;

type OnlineUsersCache = {
  data: OnlineUsers;
  timestamp: number;
};

export class SSEManager {
  private readonly connections: Map<string, Set<SSESendFunction>>;
  private readonly buffers: Map<string, RealtimeBuffer>;
  private batchInterval: Timer | null;
  private onlineUsersInterval: Timer | null;
  private readonly maxBufferSize: number;
  private readonly batchIntervalMs: number;
  private readonly onlineUsersCache: Map<string, OnlineUsersCache>;
  private readonly onlineUsersCacheTTL: number;
  private readonly onlineUsersRefreshMs: number;

  constructor(
    batchIntervalMs = 3000,
    maxBufferSize = 1000,
    onlineUsersCacheTTL = 30_000,
    onlineUsersRefreshMs = 30_000
  ) {
    this.connections = new Map();
    this.buffers = new Map();
    this.batchInterval = null;
    this.onlineUsersInterval = null;
    this.maxBufferSize = maxBufferSize;
    this.batchIntervalMs = batchIntervalMs;
    this.onlineUsersCache = new Map();
    this.onlineUsersCacheTTL = onlineUsersCacheTTL;
    this.onlineUsersRefreshMs = onlineUsersRefreshMs;
  }

  addConnection(appId: string, sendFn: SSESendFunction): () => void {
    if (!this.connections.has(appId)) {
      this.connections.set(appId, new Set());
    }
    if (!this.buffers.has(appId)) {
      this.buffers.set(appId, { events: [], sessions: [], devices: [] });
    }

    this.connections.get(appId)?.add(sendFn);

    return () => this.removeConnection(appId, sendFn);
  }

  removeConnection(appId: string, sendFn: SSESendFunction): void {
    const connections = this.connections.get(appId);
    if (connections) {
      connections.delete(sendFn);

      if (connections.size === 0) {
        this.connections.delete(appId);
        this.buffers.delete(appId);
        this.onlineUsersCache.delete(appId);
      }
    }
  }

  pushEvent(appId: string, event: RealtimeEvent): void {
    const buffer = this.buffers.get(appId);
    if (!buffer) {
      return;
    }

    buffer.events.push(event);

    if (buffer.events.length > this.maxBufferSize) {
      buffer.events = buffer.events.slice(-this.maxBufferSize);
    }
  }

  pushSession(appId: string, session: RealtimeSession): void {
    const buffer = this.buffers.get(appId);
    if (!buffer) {
      return;
    }

    buffer.sessions.push(session);

    if (buffer.sessions.length > this.maxBufferSize) {
      buffer.sessions = buffer.sessions.slice(-this.maxBufferSize);
    }
  }

  pushDevice(appId: string, device: RealtimeDevice): void {
    const buffer = this.buffers.get(appId);
    if (!buffer) {
      return;
    }

    buffer.devices.push(device);

    if (buffer.devices.length > this.maxBufferSize) {
      buffer.devices = buffer.devices.slice(-this.maxBufferSize);
    }
  }

  setOnlineUsers(appId: string, data: OnlineUsers): void {
    this.onlineUsersCache.set(appId, {
      data,
      timestamp: Date.now(),
    });
  }

  getOnlineUsers(appId: string): OnlineUsers {
    const cached = this.onlineUsersCache.get(appId);
    if (!cached) {
      return {
        total: 0,
        devices: [],
        platforms: {},
        countries: {},
      };
    }

    if (Date.now() - cached.timestamp > this.onlineUsersCacheTTL) {
      this.onlineUsersCache.delete(appId);
      return {
        total: 0,
        devices: [],
        platforms: {},
        countries: {},
      };
    }

    return cached.data;
  }

  private broadcast(appId: string, data: RealtimeMessage): void {
    const connections = this.connections.get(appId);
    if (!connections || connections.size === 0) {
      return;
    }

    for (const sendFn of connections) {
      try {
        sendFn(data);
      } catch {
        this.removeConnection(appId, sendFn);
      }
    }
  }

  private flushBuffers(): void {
    for (const [appId, buffer] of this.buffers.entries()) {
      const connections = this.connections.get(appId);

      if (!connections || connections.size === 0) {
        continue;
      }

      const message: RealtimeMessage = {
        timestamp: new Date().toISOString(),
        events: [...buffer.events],
        sessions: [...buffer.sessions],
        devices: [...buffer.devices],
        onlineUsers: this.getOnlineUsers(appId),
      };

      this.broadcast(appId, message);

      // Clear buffers after sending
      buffer.events = [];
      buffer.sessions = [];
      buffer.devices = [];
    }
  }

  private async refreshOnlineUsers(): Promise<void> {
    for (const appId of this.connections.keys()) {
      try {
        const onlineUsers = await getOnlineUsers(appId);
        this.setOnlineUsers(appId, onlineUsers);
      } catch (error) {
        console.error(
          `[SSEManager] Failed to refresh online users for app ${appId}:`,
          error
        );
      }
    }
  }

  start(): void {
    if (this.batchInterval) {
      return;
    }

    // Start buffer flushing interval
    this.batchInterval = setInterval(() => {
      this.flushBuffers();
    }, this.batchIntervalMs);

    this.onlineUsersInterval = setInterval(() => {
      this.refreshOnlineUsers();
    }, this.onlineUsersRefreshMs);
  }

  stop(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }

    if (this.onlineUsersInterval) {
      clearInterval(this.onlineUsersInterval);
      this.onlineUsersInterval = null;
    }

    this.connections.clear();
    this.buffers.clear();
    this.onlineUsersCache.clear();
  }

  getStats() {
    const totalConnections = Array.from(this.connections.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    return {
      totalApps: this.connections.size,
      totalConnections,
      bufferedEvents: Array.from(this.buffers.values()).reduce(
        (sum, buffer) => sum + buffer.events.length,
        0
      ),
      bufferedSessions: Array.from(this.buffers.values()).reduce(
        (sum, buffer) => sum + buffer.sessions.length,
        0
      ),
      bufferedDevices: Array.from(this.buffers.values()).reduce(
        (sum, buffer) => sum + buffer.devices.length,
        0
      ),
    };
  }
}

export const sseManager = new SSEManager(
  Number(process.env.REALTIME_BATCH_INTERVAL) || 3000,
  Number(process.env.REALTIME_MAX_BUFFER_SIZE) || 1000,
  Number(process.env.ONLINE_USERS_CACHE_TTL) || 60_000, // Cache TTL should be longer than refresh
  Number(process.env.ONLINE_USERS_REFRESH_INTERVAL) || 30_000 // Refresh every 30 seconds
);
