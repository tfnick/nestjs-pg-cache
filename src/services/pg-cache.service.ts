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
      this.logger.log('Initializing cache with options:', JSON.stringify(this.options, null, 2));

      // 方法1: 直接传递 URI 给 Keyv
      if (this.options.uri) {
        try {
          const keyvOptions: any = {
            uri: this.options.uri,
            ttl: this.options.ttl || DEFAULT_CACHE_TTL,
            compression: this.options.compression,
            serialize: this.options.serialize,
            deserialize: this.options.deserialize
          };

          if (this.options.table) {
            keyvOptions.table = this.options.table;
          }
          if (this.options.useUnloggedTable !== undefined) {
            keyvOptions.useUnloggedTable = this.options.useUnloggedTable;
          }
          if (this.options.namespace) {
            keyvOptions.namespace = this.options.namespace;
          }

          this.cache = new Keyv(keyvOptions);
          this.logger.log('Keyv initialized successfully with URI method');
        } catch (uriError) {
          this.logger.warn('URI method failed, trying PostgresStore:', uriError);
          
          // 方法2: 使用 PostgresStore 实例
          const postgresStore = new PostgresStore({
            uri: this.options.uri,
            table: this.options.table || 'keyv_cache',
            useUnloggedTable: this.options.useUnloggedTable
          });

          const keyvOptions: any = {
            store: postgresStore,
            ttl: this.options.ttl || DEFAULT_CACHE_TTL,
            compression: this.options.compression,
            serialize: this.options.serialize,
            deserialize: this.options.deserialize
          };

          if (this.options.namespace) {
            keyvOptions.namespace = this.options.namespace;
          }

          this.cache = new Keyv(keyvOptions);
          this.logger.log('Keyv initialized successfully with PostgresStore method');
        }
      } else if (this.options.store) {
        // 使用提供的存储实例
        const keyvOptions: any = {
          store: this.options.store,
          ttl: this.options.ttl || DEFAULT_CACHE_TTL,
          compression: this.options.compression,
          serialize: this.options.serialize,
          deserialize: this.options.deserialize
        };

        if (this.options.namespace) {
          keyvOptions.namespace = this.options.namespace;
        }

        this.cache = new Keyv(keyvOptions);
        this.logger.log('Keyv initialized successfully with provided store');
      } else {
        // 使用内存存储
        const keyvOptions: any = {
          ttl: this.options.ttl || DEFAULT_CACHE_TTL,
          compression: this.options.compression,
          serialize: this.options.serialize,
          deserialize: this.options.deserialize
        };

        if (this.options.namespace) {
          keyvOptions.namespace = this.options.namespace;
        }

        this.cache = new Keyv(keyvOptions);
        this.logger.log('Keyv initialized successfully with memory storage');
      }

      // 处理连接错误
      this.cache.on('error', (error) => {
        this.logger.error('Cache connection error:', error);
      });

      this.logger.log('Cache initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize cache:', error);
      throw error;
    }
  }

  getClient(): any {
    return this.cache;
  }

  /**
   * 基本信息模拟实现
   * @returns 模拟的Redis INFO信息
   */
  async getInfo(): Promise<Record<string, string>> {
    // PostgreSQL 不支持类似 Redis 的 INFO 命令
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
   * 分页查询缓存数据不支持
   * @param data 分页参数
   * @returns 空数组
   */
  async skipFind(data: { key: string; pageSize: number; pageNum: number }): Promise<string[]> {
    // Keyv 不支持列表分页查询，返回空数组作为模拟
    this.logger.warn('skipFind operation not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /**
   * 缓存Key数量不支持
   * @returns 模拟值0
   */
  async getDbSize(): Promise<number> {
    // Keyv 不支持直接获取键数量，返回模拟值
    this.logger.warn('getDbSize operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 命令统计不支持
   * @returns 空数组
   */
  async commandStats(): Promise<Array<{name: string; value: number}>> {
    // PostgreSQL 不支持命令统计，返回空数组
    this.logger.warn('commandStats operation not supported in PostgreSQL cache');
    return [];
  }

  /* --------------------- string 相关 -------------------------- */

  /**
   * 设置键值对支持
   * @param key 存储 key 值
   * @param val key 对应的val
   * @param ttl 可选，过期时间，单位毫秒
   */
  async set(key: string, val: any, ttl?: number): Promise<'OK' | null> {
    if (!key) return null;
    try {
      this.logger.debug(`Setting key: ${key}, value type: ${typeof val}`);
      
      // 统一进行JSON序列化，确保类型一致性
      const data = JSON.stringify(val);
      const result = await this.cache.set(key, data, ttl);
      
      this.logger.debug(`Set result: ${result} for key: ${key}`);
      return result ? 'OK' : null;
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error);
      return null;
    }
  }

  /**
   * 批量获取值支持
   * @param keys 键数组
   * @returns 值数组
   */
  async mget(keys: string[]): Promise<any[]> {
    if (!keys || keys.length === 0) return [];
    try {
      const results = await Promise.all(
        keys.map(key => this.cache.get(key))
      );
      return results.map(item => {
        if (item === undefined || item === null) return null;
        
        // 始终进行JSON解析，保持与set方法的一致性
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
   * 获取值支持
   * @param key 键
   * @returns 值
   */
  async get(key: string): Promise<any> {
    if (!key || key === '*') return null;
    try {
      this.logger.debug(`Getting key: ${key}`);
      
      const res = await this.cache.get(key);
      this.logger.debug(`Raw get result for ${key}:`, res);
      
      if (res === undefined || res === null) return null;
      
      // 始终进行JSON解析，保持与set方法的一致性
      try {
        return JSON.parse(res);
      } catch (parseError) {
        // 如果解析失败，返回原始字符串
        return res;
      }
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除键支持
   * @param keys 键或键数组
   * @returns 删除的数量
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
   * 获取剩余生存时间不支持
   * @param key 键
   * @returns 模拟值-1
   */
  async ttl(key: string): Promise<number | null> {
    if (!key) return null;
    // Keyv 不支持 TTL 查询，返回 -1 表示永不过期
    this.logger.warn('ttl operation not supported in PostgreSQL cache, returning -1');
    return -1;
  }



  /**
   * 使用查询函数执行键匹配
   * @param queryFn 查询函数
   * @param pattern 模式
   * @returns 匹配的键数组
   */
  private async keysWithQuery(queryFn: any, pattern: string): Promise<string[]> {
    // 获取存储配置，提供默认值
    const store = (this.cache as any).opts?.store || {};
    const storeOpts = store.opts || {};
    const schema = storeOpts.schema || 'public';
    const table = storeOpts.table || 'keyv';

    // 处理右侧通配符
    const prefix = pattern.slice(0, -1); // 移除最后的 '*'
    
    // 构建所有可能的模式
    const possiblePatterns = [
      `keyv:${prefix}%`,  // 默认情况
      `${prefix}%`,       // 无前缀情况
      ...(this.options.namespace ? [`keyv:${this.options.namespace}:${prefix}%`] : [])
    ];

    const matchedKeys: Set<string> = new Set();

    // 对每个模式进行查询
    for (const sqlPattern of possiblePatterns) {
      try {
        const sql = `SELECT key FROM ${schema}.${table} WHERE key LIKE $1`;
        const rows = await queryFn(sql, [sqlPattern]);
        
        for (const row of rows) {
          const fullKey = row.key;
          let cleanKey = fullKey;
          
          // 移除 keyv 前缀
          if (fullKey.startsWith('keyv:')) {
            cleanKey = fullKey.substring(5); // 移除 'keyv:'
          }
          
          // 如果还有 namespace 前缀，也移除
          if (this.options.namespace && cleanKey.startsWith(`${this.options.namespace}:`)) {
            cleanKey = cleanKey.substring(this.options.namespace.length + 1);
          }
          
          // 确保键匹配请求的前缀
          if (cleanKey.startsWith(prefix)) {
            matchedKeys.add(cleanKey);
          }
        }
      } catch (error) {
        this.logger.debug(`Query failed for pattern ${sqlPattern}:`, (error as Error).message);
      }
    }

    const result = Array.from(matchedKeys);
    this.logger.debug(`Found ${result.length} keys matching pattern: ${pattern}`);
    return result;
  }

  /**
   * 获取匹配的键支持右侧通配符
   * @param pattern 模式，支持右侧通配符，如 'user:*' 或 'prefix*'
   * @returns 匹配的键数组
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      if (!pattern || pattern === '*') {
        // 如果没有模式或者是全匹配，返回空（避免返回所有键造成性能问题）
        this.logger.warn('keys operation with "*" or empty pattern not supported for performance reasons');
        return [];
      }

      // 检查是否包含通配符
      const hasWildcard = pattern.includes('*');
      
      if (!hasWildcard) {
        // 如果没有通配符，检查单个键是否存在
        const exists = await this.hasKey(pattern);
        return exists ? [pattern] : [];
      }

      // 如果不是右侧通配符，暂时不支持
      if (!pattern.endsWith('*')) {
        this.logger.warn('keys operation only supports right-side wildcards (prefix*)');
        return [];
      }

      // 获取底层存储实例来执行 SQL 查询
      const store = (this.cache as any).opts?.store;
      if (!store) {
        this.logger.warn('keys operation with wildcard not supported: cannot access database query');
        return [];
      }

      // 检查 store 是否有 query 方法
      if (typeof store.query !== 'function') {
        this.logger.debug('store.query is not a function, trying alternative approaches');
        
        // 尝试通过 cache 实例获取查询函数
        const cacheQuery = (this.cache as any).query;
        if (typeof cacheQuery === 'function') {
          // 使用 cache 的查询方法
          return await this.keysWithQuery(cacheQuery, pattern);
        }
        
        // 尝试通过 KeyvPostgres 实例直接访问
        if (typeof store.connect === 'function') {
          try {
            const query = await store.connect();
            return await this.keysWithQuery(query, pattern);
          } catch (error) {
            this.logger.debug('Failed to connect to database', error);
          }
        }
        
        this.logger.warn('keys operation with wildcard not supported: cannot access database query');
        return [];
      }

      // 使用直接的查询方法
      return await this.keysWithQuery(store.query, pattern);
    } catch (error) {
      this.logger.error('Failed to execute keys operation', error);
      return [];
    }
  }

  /**
   * 设置键值对，仅当键不存在时支持
   * @param key 键
   * @param val 值
   * @param ttl 过期时间(毫秒)
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
   * 设置键值对，仅当键存在时支持
   * @param key 键
   * @param val 值
   * @param ttl 过期时间(毫秒)
   */
  async setex(key: string, val: any, ttl?: number): Promise<'OK' | null> {
    if (!key) return null;
    try {
      // 检查键是否存在
      const exists = await this.hasKey(key);
      if (!exists) return null; // 键不存在，设置失败
      
      // 更新已存在的键
      return await this.set(key, val, ttl);
    } catch (error) {
      this.logger.error(`Failed to setex key: ${key}`, error);
      return null;
    }
  }

  /**
   * 获取字符串值的长度支持
   * @param key 键
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
   * 设置哈希字段值使用复合键模拟
   * @param key 哈希键
   * @param field 字段名
   * @param value 字段值
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
   * 批量设置哈希字段值使用复合键模拟
   * @param key 哈希键
   * @param data 字段数据
   * @param expire 过期时间(秒)
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
   * 获取哈希字段值支持
   * @param key 哈希键
   * @param field 字段名
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
   * 获取所有哈希字段值不支持
   * @param key 哈希键
   * @returns 空数组
   */
  async hvals(key: string): Promise<string[]> {
    if (!key) return [];
    // 不支持获取所有字段值，返回空数组
    this.logger.warn('hvals operation not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /**
   * 获取所有哈希字段不支持
   * @param key 哈希键
   * @returns 空对象
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    if (!key) return {};
    // 不支持获取所有字段，返回空对象
    this.logger.warn('hGetAll operation not supported in PostgreSQL cache, returning empty object');
    return {};
  }

  /**
   * 删除哈希字段支持
   * @param key 哈希键
   * @param fields 字段名或字段名数组
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
   * 删除所有哈希字段不支持
   * @param key 哈希键
   * @returns 0
   */
  async hdelAll(key: string): Promise<number> {
    if (!key) return 0;
    // 不支持获取所有字段删除，返回 0
    this.logger.warn('hdelAll operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 检查哈希字段是否存在支持
   * @param key 哈希键
   * @param field 字段名
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
   * 获取哈希字段数量不支持
   * @param key 哈希键
   * @returns 模拟值0
   */
  async hlen(key: string): Promise<number> {
    if (!key) return 0;
    this.logger.warn('hlen operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 获取哈希所有字段名不支持
   * @param key 哈希键
   * @returns 空数组
   */
  async hkeys(key: string): Promise<string[]> {
    if (!key) return [];
    this.logger.warn('hkeys operation not supported in PostgreSQL cache, returning empty array');
    return [];
  }

  /* -----------   list 相关操作全部不支持 ------------------ */

  /**
   * 获取列表长度不支持
   */
  async lLength(key: string): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lLength operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 通过索引设置列表元素的值不支持
   */
  async lSet(key: string, index: number, val: string): Promise<'OK' | null> {
    if (!key || index < 0) return null;
    this.logger.warn('lSet operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 通过索引获取列表元素不支持
   */
  async lIndex(key: string, index: number): Promise<string | null> {
    if (!key || index < 0) return null;
    this.logger.warn('lIndex operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 获取列表范围不支持
   */
  async lRange(key: string, start: number, stop: number): Promise<string[] | null> {
    if (!key) return null;
    this.logger.warn('lRange operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 左推入列表不支持
   */
  async lLeftPush(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lLeftPush operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 左推入已存在列表不支持
   */
  async lLeftPushIfPresent(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lLeftPushIfPresent operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 左插入不支持
   */
  async lLeftInsert(key: string, pivot: string, val: string): Promise<number> {
    if (!key || !pivot) return 0;
    this.logger.warn('lLeftInsert operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 右插入不支持
   */
  async lRightInsert(key: string, pivot: string, val: string): Promise<number> {
    if (!key || !pivot) return 0;
    this.logger.warn('lRightInsert operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 右推入不支持
   */
  async lRightPush(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lRightPush operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 右推入已存在列表不支持
   */
  async lRightPushIfPresent(key: string, ...val: string[]): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lRightPushIfPresent operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 左弹出不支持
   */
  async lLeftPop(key: string): Promise<string | null> {
    if (!key) return null;
    this.logger.warn('lLeftPop operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 右弹出不支持
   */
  async lRightPop(key: string): Promise<string | null> {
    if (!key) return null;
    this.logger.warn('lRightPop operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 列表修剪不支持
   */
  async lTrim(key: string, start: number, stop: number): Promise<'OK' | null> {
    if (!key) return null;
    this.logger.warn('lTrim operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 移除列表元素不支持
   */
  async lRemove(key: string, count: number, val: string): Promise<number> {
    if (!key) return 0;
    this.logger.warn('lRemove operation not supported in PostgreSQL cache, returning 0');
    return 0;
  }

  /**
   * 弹出并推入不支持
   */
  async lPoplPush(sourceKey: string, destinationKey: string, timeout: number): Promise<string | null> {
    if (!sourceKey || !destinationKey) return null;
    this.logger.warn('lPoplPush operation not supported in PostgreSQL cache, returning null');
    return null;
  }

  /**
   * 删除全部缓存支持
   * @returns 删除的数量
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

  // ========== 向后兼容的原有方法 ==========

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
   * 向后兼容的删除方法(避免与del方法冲突)
   */
  async deleteCompat(key: string): Promise<boolean> {
    const result = await this.del(key);
    return result > 0;
  }

  /**
   * 向后兼容的获取方法(避免与get方法冲突)
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