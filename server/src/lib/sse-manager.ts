import type {
  OnlineUsers,
  RealtimeDevice,
  RealtimeEvent,
  RealtimeMessage,
  RealtimeSession,
} from '@/schemas';
import { getOnlineUsers } from './online-tracker';

type SSEManagerOptions = {
  batchIntervalMs?: number;
  maxBufferSize?: number;
  onlineUsersCacheTTL?: number;
  onlineUsersRefreshMs?: number;
  heartbeatIntervalMs?: number;
  connectionTimeoutMs?: number;
};

const DEFAULT_OPTIONS: Required<SSEManagerOptions> = {
  batchIntervalMs: 2000,
  maxBufferSize: 1000,
  onlineUsersCacheTTL: 10_000,
  onlineUsersRefreshMs: 4000,
  heartbeatIntervalMs: 30_000,
  connectionTimeoutMs: 90_000,
};

type RealtimeBuffer = {
  events: RealtimeEvent[];
  sessions: RealtimeSession[];
  devices: RealtimeDevice[];
};

type SSEConnection = {
  sendFn: SSESendFunction;
  lastActivity: number;
};

type SSESendFunction = (data: RealtimeMessage) => void;

type OnlineUsersCache = {
  data: OnlineUsers;
  timestamp: number;
};

export class SSEManager {
  private readonly connections: Map<
    string,
    Map<SSESendFunction, SSEConnection>
  >;
  private readonly buffers: Map<string, RealtimeBuffer>;
  private batchInterval: Timer | null;
  private onlineUsersInterval: Timer | null;
  private heartbeatInterval: Timer | null;
  private readonly maxBufferSize: number;
  private readonly batchIntervalMs: number;
  private readonly onlineUsersCache: Map<string, OnlineUsersCache>;
  private readonly onlineUsersCacheTTL: number;
  private readonly onlineUsersRefreshMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly connectionTimeoutMs: number;
  private isRefreshingOnlineUsers: boolean;

  constructor(options: SSEManagerOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };

    this.connections = new Map();
    this.buffers = new Map();
    this.batchInterval = null;
    this.onlineUsersInterval = null;
    this.heartbeatInterval = null;
    this.maxBufferSize = config.maxBufferSize;
    this.batchIntervalMs = config.batchIntervalMs;
    this.onlineUsersCache = new Map();
    this.onlineUsersCacheTTL = config.onlineUsersCacheTTL;
    this.onlineUsersRefreshMs = config.onlineUsersRefreshMs;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs;
    this.connectionTimeoutMs = config.connectionTimeoutMs;
    this.isRefreshingOnlineUsers = false;

    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    const shutdown = () => {
      this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  addConnection(appId: string, sendFn: SSESendFunction): () => void {
    if (!this.connections.has(appId)) {
      this.connections.set(appId, new Map());
    }
    if (!this.buffers.has(appId)) {
      this.buffers.set(appId, { events: [], sessions: [], devices: [] });
    }

    const connection: SSEConnection = {
      sendFn,
      lastActivity: Date.now(),
    };
    this.connections.get(appId)?.set(sendFn, connection);

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

  updateConnectionActivity(appId: string, sendFn: SSESendFunction): void {
    const connections = this.connections.get(appId);
    const connection = connections?.get(sendFn);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();

    for (const [appId, connections] of this.connections.entries()) {
      const staleConnections: SSESendFunction[] = [];

      for (const [sendFn, connection] of connections.entries()) {
        if (now - connection.lastActivity > this.connectionTimeoutMs) {
          staleConnections.push(sendFn);
        }
      }

      for (const sendFn of staleConnections) {
        this.removeConnection(appId, sendFn);
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
        platforms: {},
        countries: {},
      };
    }

    if (Date.now() - cached.timestamp > this.onlineUsersCacheTTL) {
      this.onlineUsersCache.delete(appId);
      return {
        total: 0,
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

    for (const [sendFn, connection] of connections.entries()) {
      try {
        sendFn(data);
        connection.lastActivity = Date.now();
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

      buffer.events = [];
      buffer.sessions = [];
      buffer.devices = [];
    }
  }

  private async refreshOnlineUsers(): Promise<void> {
    if (this.isRefreshingOnlineUsers) {
      return;
    }

    this.isRefreshingOnlineUsers = true;

    try {
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
    } finally {
      this.isRefreshingOnlineUsers = false;
    }
  }

  start(): void {
    if (this.batchInterval) {
      return;
    }

    this.batchInterval = setInterval(() => {
      this.flushBuffers();
    }, this.batchIntervalMs);

    this.onlineUsersInterval = setInterval(() => {
      this.refreshOnlineUsers();
    }, this.onlineUsersRefreshMs);

    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.heartbeatIntervalMs);
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

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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

export const sseManager = new SSEManager();
