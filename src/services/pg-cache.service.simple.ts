import { Injectable, Inject, Logger } from '@nestjs/common';
import Keyv from 'keyv';
import { PG_CACHE_TOKEN, DEFAULT_CACHE_TTL } from '../constants';
import { PgCacheOptions } from '../interfaces/pg-cache-options.interface';
import PostgresStore from '@keyv/postgres';

@Injectable()
export class PgCacheServiceSimple {
  private readonly logger = new Logger(PgCacheServiceSimple.name);
  private cache!: Keyv;

  constructor(
    @Inject(PG_CACHE_TOKEN) private readonly options: PgCacheOptions
  ) {
    this.initializeCache();
  }

  private initializeCache() {
    try {
      // 简化的 Keyv 配置
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
        // 创建 PostgresStore 实例
        const postgresStore = new PostgresStore({
          uri: this.options.uri,
          table: this.options.table || 'keyv_cache',
          useUnloggedTable: this.options.useUnloggedTable
        });
        keyvOptions.store = postgresStore;
      }

      // 添加命名空间
      if (this.options.namespace) {
        keyvOptions.namespace = this.options.namespace;
      }

      // 创建 Keyv 实例
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

  getClient(): any {
    return this.cache;
  }

  /**
   * 设置键值对
   */
  async set(key: string, val: any, ttl?: number): Promise<'OK' | null> {
    if (!key) return null;
    try {
      // 对于字符串值直接存储，其他类型JSON序列化
      const data = typeof val === 'string' ? val : JSON.stringify(val);
      const result = await this.cache.set(key, data, ttl);
      return result ? 'OK' : null;
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error);
      return null;
    }
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<any> {
    if (!key || key === '*') return null;
    try {
      const res = await this.cache.get(key);
      if (res === undefined || res === null) return null;
      
      // 尝试解析JSON，如果失败则返回原始字符串
      try {
        return JSON.parse(res);
      } catch (parseError) {
        // 如果解析失败，说明是原始字符串
        return res;
      }
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除键
   */
  async del(keys: string | string[]): Promise<number> {
    if (!keys || keys === '*') return 0;
    if (typeof keys === 'string') keys = [keys];
    
    try {
      const results = await Promise.all(
        keys.map(key => this.cache.delete(key))
      );
      return results.filter(Boolean).length;
    } catch (error) {
      this.logger.error('Failed to delete keys', error);
      return 0;
    }
  }

  /**
   * 批量获取值
   */
  async mget(keys: string[]): Promise<any[]> {
    if (!keys || keys.length === 0) return [];
    try {
      const results = await Promise.all(
        keys.map(key => this.cache.get(key))
      );
      return results.map(item => {
        if (item === undefined || item === null) return null;
        
        // 尝试解析JSON，如果失败则返回原始字符串
        try {
          return JSON.parse(item);
        } catch (parseError) {
          return item;
        }
      });
    } catch (error) {
      this.logger.error('Failed to get multiple keys', error);
      return keys.map(() => null);
    }
  }

  /**
   * 清空所有缓存
   */
  async reset(): Promise<number> {
    try {
      await this.cache.clear();
      return 1;
    } catch (error) {
      this.logger.error('Failed to reset cache', error);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async hasKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const value = await this.cache.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      this.logger.error(`Failed to check key: ${key}`, error);
      return false;
    }
  }

  /**
   * 检查键是否存在 - Redis兼容方法
   */
  async exists(key: string): Promise<number> {
    if (!key) return 0;
    try {
      const value = await this.cache.get(key);
      return value !== undefined && value !== null ? 1 : 0;
    } catch (error) {
      this.logger.error(`Failed to check exists for key: ${key}`, error);
      return 0;
    }
  }

  /**
   * 设置键值对，仅当键不存在时
   */
  async setnx(key: string, val: any, ttl?: number): Promise<number> {
    if (!key) return 0;
    try {
      // 检查键是否存在
      const exists = await this.hasKey(key);
      if (exists) return 0; // 键已存在，设置失败
      
      // 设置新键
      const result = await this.set(key, val, ttl);
      return result === 'OK' ? 1 : 0;
    } catch (error) {
      this.logger.error(`Failed to setnx key: ${key}`, error);
      return 0;
    }
  }

  /**
   * 获取字符串值的长度
   */
  async strlen(key: string): Promise<number> {
    if (!key) return 0;
    try {
      const value = await this.get(key);
      if (value === null) return 0;
      
      return typeof value === 'string' ? value.length : JSON.stringify(value).length;
    } catch (error) {
      this.logger.error(`Failed to get strlen for key: ${key}`, error);
      return 0;
    }
  }

  /**
   * 设置哈希字段值
   */
  async hset(key: string, field: string, value: string): Promise<string | number | null> {
    if (!key || !field) return null;
    try {
      const hashKey = `${key}:${field}`;
      const result = await this.cache.set(hashKey, value);
      return result ? 'OK' : null;
    } catch (error) {
      this.logger.error(`Failed to hset key: ${key}, field: ${field}`, error);
      return null;
    }
  }

  /**
   * 获取哈希字段值
   */
  async hget(key: string, field: string): Promise<string | null> {
    if (!key || !field) return null;
    try {
      const hashKey = `${key}:${field}`;
      const value = await this.cache.get(hashKey);
      return value || null;
    } catch (error) {
      this.logger.error(`Failed to hget key: ${key}, field: ${field}`, error);
      return null;
    }
  }

  /**
   * 删除哈希字段
   */
  async hdel(key: string, fields: string | string[]): Promise<number> {
    if (!key || !fields || (Array.isArray(fields) && fields.length === 0)) return 0;
    
    const fieldArray = Array.isArray(fields) ? fields : [fields];
    
    try {
      const operations = fieldArray.map(async (field) => {
        const hashKey = `${key}:${field}`;
        return await this.cache.delete(hashKey);
      });
      
      const results = await Promise.all(operations);
      return results.filter(Boolean).length;
    } catch (error) {
      this.logger.error(`Failed to hdel key: ${key}`, error);
      return 0;
    }
  }

  /**
   * 检查哈希字段是否存在
   */
  async hexists(key: string, field: string): Promise<number> {
    if (!key || !field) return 0;
    try {
      const hashKey = `${key}:${field}`;
      const value = await this.cache.get(hashKey);
      return value !== undefined && value !== null ? 1 : 0;
    } catch (error) {
      this.logger.error(`Failed to check hexists for key: ${key}, field: ${field}`, error);
      return 0;
    }
  }
}