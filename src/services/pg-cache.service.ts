import { Injectable, Inject, Logger } from '@nestjs/common';
import Keyv from 'keyv';
import { PG_CACHE_TOKEN, DEFAULT_CACHE_TTL } from '../constants';
import { PgCacheOptions } from '../interfaces/pg-cache-options.interface';

@Injectable()
export class PgCacheService {
  private readonly logger = new Logger(PgCacheService.name);
  private cache!: Keyv;

  constructor(
    @Inject(PG_CACHE_TOKEN) private readonly options: PgCacheOptions
  ) {
    this.initializeCache();
  }

  private initializeCache() {
    try {
      const keyvOptions: any = {
        ttl: this.options.ttl || DEFAULT_CACHE_TTL,
        compression: this.options.compression,
        serialize: this.options.serialize,
        deserialize: this.options.deserialize
      };

      // 使用存储实例或 URI
      if (this.options.store) {
        keyvOptions.store = this.options.store;
      } else if (this.options.uri) {
        // 构建 postgres 配置对象
        const postgresConfig: any = {
          uri: this.options.uri
        };
        
        // 添加其他配置选项
        if (this.options.table) postgresConfig.table = this.options.table;
        if (this.options.useUnloggedTable !== undefined) postgresConfig.useUnloggedTable = this.options.useUnloggedTable;
        
        keyvOptions.store = postgresConfig;
      }

      // 添加其他配置
      if (this.options.namespace) keyvOptions.namespace = this.options.namespace;

      this.cache = new Keyv(keyvOptions);

      // 处理连接错误
      this.cache.on('error', (error) => {
        this.logger.error('Cache connection error:', error);
      });

      this.logger.log('PostgreSQL cache initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize cache:', error);
      throw error;
    }
  }

  /**
   * Get value from cache by key
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      return await this.cache.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      return await this.cache.delete(key);
    } catch (error) {
      this.logger.error(`Failed to delete key: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.cache.get(key);
      return value !== undefined;
    } catch (error) {
      this.logger.error(`Failed to check key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get multiple values by keys
   */
  async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
    try {
      const results = await Promise.all(
        keys.map(key => this.cache.get(key))
      );
      return results;
    } catch (error) {
      this.logger.error('Failed to get multiple keys', error);
      return keys.map(() => undefined);
    }
  }

  /**
   * Set multiple values
   */
  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean[]> {
    try {
      const results = await Promise.all(
        keyValuePairs.map(({ key, value, ttl }) => this.cache.set(key, value, ttl))
      );
      return results;
    } catch (error) {
      this.logger.error('Failed to set multiple keys', error);
      return keyValuePairs.map(() => false);
    }
  }

  /**
   * Delete multiple keys
   */
  async mdelete(keys: string[]): Promise<boolean[]> {
    try {
      const results = await Promise.all(
        keys.map(key => this.cache.delete(key))
      );
      return results;
    } catch (error) {
      this.logger.error('Failed to delete multiple keys', error);
      return keys.map(() => false);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    size?: number;
    hitCount?: number;
    missCount?: number;
  }> {
    // Note: Keyv doesn't provide built-in statistics
    // This is a placeholder for future implementation
    return {
      size: undefined,
      hitCount: undefined,
      missCount: undefined
    };
  }
}