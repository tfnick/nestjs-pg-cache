import { Injectable, Inject, Logger } from '@nestjs/common';
import Keyv from 'keyv';
import { PG_CACHE_TOKEN, DEFAULT_CACHE_TTL } from '../constants';
import { PgCacheOptions } from '../interfaces/pg-cache-options.interface';
import PostgresStore from '@keyv/postgres';

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

      // 使用存储实例�?URI
      if (this.options.store) {
        keyvOptions.store = this.options.store;
      } else if (this.options.uri) {
        // 创建 PostgresStore 实例，确保正确初始化
        const postgresStore = new PostgresStore({
          uri: this.options.uri,
          table: this.options.table || 'keyv_cache',
          useUnloggedTable: this.options.useUnloggedTable
        });
        
        // PostgresStore 初始化是同步的，不需要等�?
        
        keyvOptions.store = postgresStore;
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

  getClient(): any {
    return this.cache;
  }

  /**
   * 基本信息 - 模拟实现
   * @returns 模拟的Redis INFO信息
   */
  async getInfo(): Promise<Record<string, string>> {
    // PostgreSQL 不支持类�?Redis �?INFO 命令
    // 返回模拟信息
    return {
      server: 'PostgreSQL Cache',
      version: '1.0.0',
      mode: 'standalone',
      os: 'Node.js',
      tcp_port: '5432',
      uptime_in_seconds: Math.floor(process.uptime()).toString(),
      connected_clients: '1'
    };
  }

  /**
   * 分页查询缓存数据 - 不支�?
   * @param data 分页参数
   * @returns 空数�?
   */
  async skipFind(data: { key: string; pageSize: number; pageNum: number }): Promise<string[]> {
    // Keyv 不支持列表分页查询，返回空数组作为模�?
    this.logger.warn('skipFind operation not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /**
   * 缓存Key数量 - 不支�?
   * @returns 模拟�?0
   */
  async getDbSize(): Promise<number> {
    // Keyv 不支持直接获取键数量，返回模拟�?
    this.logger.warn('getDbSize operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 命令统计 - 不支�?
   * @returns 空数�?
   */
  async commandStats(): Promise<Array<{name: string; value: number}>> {
    // PostgreSQL 不支持命令统计，返回空数�?
    this.logger.warn('commandStats operation not supported in PostgreSQL cache');
    return [];
  }

  /* --------------------- string 相关 -------------------------- */

  /**
   * 设置键值对 - 支持
   * @param key 存储 key �?
   * @param val key 对应�?val
   * @param ttl 可选，过期时间，单�?毫秒
   */
  async set(key: string, val: any, ttl?: number): Promise<'OK' | null> {
    if (!key) return null;
    try {
      // 对于字符串值直接存储，其他类型JSON序列�?
      const data = typeof val === 'string' ? val : JSON.stringify(val);
      const result = await this.cache.set(key, data, ttl);
      return result ? 'OK' : null;
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error);
      return null;
    }
  }

  /**
   * 批量获取�?- 支持
   * @param keys 键数�?
   * @returns 值数�?
   */
  async mget(keys: string[]): Promise<any[]> {
    if (!keys || keys.length === 0) return [];
    try {
      const results = await Promise.all(
        keys.map(key => this.cache.get(key))
      );
      return results.map(item => {
        if (item === undefined || item === null) return null;
        
        // 尝试解析JSON，如果失败则返回原始字符�?
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
   * 获取�?- 支持
   * @param key �?
   * @returns �?
   */
  async get(key: string): Promise<any> {
    if (!key || key === '*') return null;
    try {
      const res = await this.cache.get(key);
      if (res === undefined || res === null) return null;
      
      // 尝试解析JSON，如果失败则返回原始字符�?
      try {
        return JSON.parse(res);
      } catch (parseError) {
        // 如果解析失败，说明是原始字符�?
        return res;
      }
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除�?- 支持
   * @param keys 键或键数�?
   * @returns 删除的数�?
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
   * 获取剩余生存时间 - 不支�?
   * @param key �?
   * @returns 模拟�?-1
   */
  async ttl(key: string): Promise<number | null> {
    if (!key) return null;
    // Keyv 不支�?TTL 查询，返�?-1 表示永不过期
    this.logger.warn('ttl operation not supported in PostgreSQL cache, returning -1');
    return -1;
  }

  /**
   * 获取匹配的键 - 不支�?
   * @param key 模式
   * @returns 空数�?
   */
  async keys(key?: string): Promise<string[]> {
    // Keyv 不支持模式匹配查询，返回空数�?
    this.logger.warn('keys operation with pattern not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /**
   * 设置键值对，仅当键不存在时 - 支持
   * @param key �?
   * @param val �?
   * @param ttl 过期时间(毫秒)
   */
  async setnx(key: string, val: any, ttl?: number): Promise<number> {
    if (!key) return 0;
    try {
      // 检查键是否存在
      const exists = await this.hasKey(key);
      if (exists) return 0; // 键已存在，设置失�?
      
      // 设置新键
      const result = await this.set(key, val, ttl);
      return result === 'OK' ? 1 : 0;
    } catch (error) {
      this.logger.error(`Failed to setnx key: ${key}`, error);
      return 0;
    }
  }

  /**
   * 设置键值对，仅当键存在�?- 支持
   * @param key �?
   * @param val �?
   * @param ttl 过期时间(毫秒)
   */
  async setex(key: string, val: any, ttl?: number): Promise<'OK' | null> {
    if (!key) return null;
    try {
      // 检查键是否存在
      const exists = await this.hasKey(key);
      if (!exists) return null; // 键不存在，设置失�?
      
      // 更新已存在的�?
      return await this.set(key, val, ttl);
    } catch (error) {
      this.logger.error(`Failed to setex key: ${key}`, error);
      return null;
    }
  }

  /**
   * 获取字符串值的长度 - 支持
   * @param key �?
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

  /* ----------------------- hash ----------------------- */

  /**
   * 设置哈希字段�?- 使用复合键模�?
   * @param key 哈希�?
   * @param field 字段�?
   * @param value 字段�?
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
   * 批量设置哈希字段�?- 使用复合键模�?
   * @param key 哈希�?
   * @param data 字段数据
   * @param expire 过期时间(�?
   */
  async hmset(key: string, data: Record<string, string | number | boolean>, expire?: number): Promise<number> {
    if (!key || !data) return 0;
    
    try {
      const operations = Object.entries(data).map(async ([field, value]) => {
        const hashKey = `${key}:${field}`;
        return await this.cache.set(hashKey, value.toString(), expire ? expire * 1000 : undefined);
      });
      
      const results = await Promise.all(operations);
      return results.filter(Boolean).length;
    } catch (error) {
      this.logger.error(`Failed to hmset key: ${key}`, error);
      return 0;
    }
  }

  /**
   * 获取哈希字段�?- 支持
   * @param key 哈希�?
   * @param field 字段�?
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
   * 获取所有哈希字段�?- 不支�?
   * @param key 哈希�?
   * @returns 空数�?
   */
  async hvals(key: string): Promise<string[]> {
    if (!key) return [];
    // 不支持获取所有字段值，返回空数�?
    this.logger.warn('hvals operation not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /**
   * 获取所有哈希字�?- 不支�?
   * @param key 哈希�?
   * @returns 空对�?
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    if (!key) return {};
    // 不支持获取所有字段，返回空对�?
    this.logger.warn('hGetAll operation not supported in PostgreSQL cache, returning empty object');
    return {};
  }

  /**
   * 删除哈希字段 - 支持
   * @param key 哈希�?
   * @param fields 字段名或字段名数�?
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
   * 删除所有哈希字�?- 不支�?
   * @param key 哈希�?
   * @returns 0
   */
  async hdelAll(key: string): Promise<number> {
    if (!key) return 0;
    // 不支持获取所有字段删除，返回 0
    this.logger.warn('hdelAll operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 检查哈希字段是否存�?- 支持
   * @param key 哈希�?
   * @param field 字段�?
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

  /**
   * 获取哈希字段数量 - 不支�?
   * @param key 哈希�?
   * @returns 模拟�?0
   */
  async hlen(key: string): Promise<number> {
    if (!key) return 0;
    this.logger.warn('hlen operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 获取哈希所有字段名 - 不支�?
   * @param key 哈希�?
   * @returns 空数�?
   */
  async hkeys(key: string): Promise<string[]> {
    if (!key) return [];
    this.logger.warn('hkeys operation not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /* -----------   list 相关操作 - 全部不支�?------------------ */

  /**
   * 获取列表长度 - 不支�?
   */
  async lLength(key: string): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lLength operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 通过索引设置列表元素的�?- 不支�?
   */
  async lSet(key: string, index: number, val: string): Promise<'OK' | null> {
    if (!key || index < 0) return null;
    this.logger.warn('lSet operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 通过索引获取列表元素 - 不支�?
   */
  async lIndex(key: string, index: number): Promise<string | null> {
    if (!key || index < 0) return null;
    this.logger.warn('lIndex operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 获取列表范围 - 不支�?
   */
  async lRange(key: string, start: number, stop: number): Promise<string[] | null> {
    if (!key) return null;
    this.logger.warn('lRange operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 左推入列�?- 不支�?
   */
  async lLeftPush(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lLeftPush operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 左推入已存在列表 - 不支�?
   */
  async lLeftPushIfPresent(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lLeftPushIfPresent operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 左插�?- 不支�?
   */
  async lLeftInsert(key: string, pivot: string, val: string): Promise<number> {
    if (!key || !pivot) return 0;
    this.logger.warn('lLeftInsert operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 右插�?- 不支�?
   */
  async lRightInsert(key: string, pivot: string, val: string): Promise<number> {
    if (!key || !pivot) return 0;
    this.logger.warn('lRightInsert operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 右推�?- 不支�?
   */
  async lRightPush(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lRightPush operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 右推入已存在列表 - 不支�?
   */
  async lRightPushIfPresent(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lRightPushIfPresent operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 左弹�?- 不支�?
   */
  async lLeftPop(key: string): Promise<string | null> {
    if (!key) return null;
    this.logger.warn('lLeftPop operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 右弹�?- 不支�?
   */
  async lRightPop(key: string): Promise<string | null> {
    if (!key) return null;
    this.logger.warn('lRightPop operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 列表修剪 - 不支�?
   */
  async lTrim(key: string, start: number, stop: number): Promise<'OK' | null> {
    if (!key) return null;
    this.logger.warn('lTrim operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 移除列表元素 - 不支�?
   */
  async lRemove(key: string, count: number, val: string): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lRemove operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 弹出并推�?- 不支�?
   */
  async lPoplPush(sourceKey: string, destinationKey: string, timeout: number): Promise<string | null> {
    if (!sourceKey || !destinationKey) return null;
    this.logger.warn('lPoplPush operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 删除全部缓存 - 支持
   * @returns 删除的数�?
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

  // ========== 向后兼容的原有方�?==========

  /**
   * Get value from cache by key (向后兼容)
   */
  async getValue<T>(key: string): Promise<T | undefined> {
    const result = await this.get(key);
    return result || undefined;
  }

  /**
   * Set value in cache (向后兼容)
   */
  async setValue<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const result = await this.set(key, value, ttl);
    return result === 'OK';
  }

  /**
   * Delete value from cache (向后兼容)
   */
  async deleteKey(key: string): Promise<boolean> {
    const result = await this.del(key);
    return result > 0;
  }

  /**
   * Clear all cache entries (向后兼容)
   */
  async clearCache(): Promise<void> {
    await this.reset();
  }

  /**
   * Check if key exists in cache (向后兼容)
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
   * Get multiple values by keys (向后兼容)
   */
  async getMultiple<T>(keys: string[]): Promise<(T | undefined)[]> {
    const results = await this.mget(keys);
    return results.map(item => item || undefined);
  }

  /**
   * Get cache statistics (向后兼容)
   */
  async getStats(): Promise<{
    size?: number;
    hitCount?: number;
    missCount?: number;
  }> {
    return {
      size: undefined,
      hitCount: undefined,
      missCount: undefined
    };
  }

  /**
   * 向后兼容的删除方�?(避免与del方法冲突)
   */
  async deleteCompat(key: string): Promise<boolean> {
    const result = await this.del(key);
    return result > 0;
  }

  /**
   * 向后兼容的获取方�?(避免与get方法冲突)
   */
  async getCompat<T>(key: string): Promise<T | undefined> {
    try {
      const res = await this.cache.get(key);
      return res ? JSON.parse(res) : undefined;
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error);
      return undefined;
    }
  }
}
