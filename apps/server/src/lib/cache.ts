import type { Table } from 'drizzle-orm';
import { Cache } from 'drizzle-orm/cache/core';
import Redis from 'ioredis';

type CacheConfig = {
  ex?: number;
  px?: number;
};

type CacheData = {
  value: unknown;
  tables: string[];
};

type MutationOption = {
  tables?: string | string[] | Table | Table[];
  tags?: string | string[];
};

export class RedisCache extends Cache {
  private readonly redis: Redis;
  private readonly config: CacheConfig;
  private readonly tableKeysMap: Map<string, Set<string>> = new Map();
  private readonly maxTableKeys = 10_000;
  private readonly maxTables = 20;
  private isConnected = false;

  constructor(redisUrl: string, config: CacheConfig = {}) {
    super();
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
      enableOfflineQueue: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });
    this.config = config;
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('[RedisCache] Connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      this.isConnected = false;
    });
  }

  strategy(): 'explicit' | 'all' {
    return 'explicit';
  }

  // biome-ignore lint/suspicious/noExplicitAny: JSON replacer requires any
  private dateReplacer(_key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  // biome-ignore lint/suspicious/noExplicitAny: JSON reviver requires any
  private dateReviver(_key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle cache API requires any[]
  async get(key: string): Promise<any[] | undefined> {
    if (!this.isConnected) {
      return;
    }

    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return;
      }

      const data = JSON.parse(cached, this.dateReviver) as CacheData;
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle cache API requires any[]
      return data.value as any[];
    } catch (error) {
      console.error('[RedisCache] Get error:', error);
      return;
    }
  }

  async put(key: string, value: unknown, tables: string[]): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const data: CacheData = { value, tables };
      const serialized = JSON.stringify(data, this.dateReplacer);

      if (this.config.ex) {
        await this.redis.setex(key, this.config.ex, serialized);
      } else if (this.config.px) {
        await this.redis.psetex(key, this.config.px, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      this.trackTableKey(tables, key);
    } catch (error) {
      console.error('[RedisCache] Put error:', error);
    }
  }

  private trackTableKey(tables: string[], key: string): void {
    if (this.tableKeysMap.size >= this.maxTables) {
      const firstTable = this.tableKeysMap.keys().next().value;
      if (firstTable) {
        this.tableKeysMap.delete(firstTable);
      }
    }

    for (const table of tables) {
      if (!this.tableKeysMap.has(table)) {
        this.tableKeysMap.set(table, new Set());
      }

      const keys = this.tableKeysMap.get(table);
      if (keys) {
        if (keys.size >= this.maxTableKeys) {
          const firstKey = keys.values().next().value;
          if (firstKey) {
            keys.delete(firstKey);
          }
        }
        keys.add(key);
      }
    }
  }

  async onMutate(params: MutationOption): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (!params.tables) {
        return;
      }

      const tables = Array.isArray(params.tables)
        ? params.tables
        : [params.tables];

      for (const table of tables) {
        const tableName = typeof table === 'string' ? table : table._.name;
        const keys = this.tableKeysMap.get(tableName);

        if (!keys || keys.size === 0) {
          continue;
        }

        const pipeline = this.redis.pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }
        const results = await pipeline.exec();

        if (results) {
          let i = 0;
          for (const key of keys) {
            const result = results[i++];
            if (result && !result[0]) {
              keys.delete(key);
            }
          }
        }

        if (keys.size === 0) {
          this.tableKeysMap.delete(tableName);
        }
      }
    } catch (error) {
      console.error('[RedisCache] OnMutate error:', error);
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export function redisCache(
  redisUrl: string,
  config: CacheConfig = {}
): RedisCache {
  return new RedisCache(redisUrl, config);
}
