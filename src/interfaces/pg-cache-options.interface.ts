import type PostgresStore from '@keyv/postgres';

export interface PgCacheOptions {
  /**
   * PostgreSQL connection string or configuration object
   */
  uri?: string;
  
  /**
   * Table name for storing cache data (default: 'keyv')
   */
  table?: string;
  
  /**
   * Key prefix for cache keys (default: 'keyv:')
   */
  namespace?: string;
  
  /**
   * Default TTL (time to live) in milliseconds
   */
  ttl?: number;
  
  /**
   * Whether to use compression (default: false)
   */
  compression?: boolean;
  
  /**
   * Whether to use unlogged table for better performance (default: false)
   * Note: Unlogged tables are not crash-safe and are not replicated to standby servers
   */
  useUnloggedTable?: boolean;
  
  /**
   * Serialization function
   */
  serialize?: (data: any) => string;
  
  /**
   * Deserialization function
   */
  deserialize?: (data: string) => any;
  
  /**
   * Custom PostgresStore instance
   */
  store?: PostgresStore;
}

export interface PgCacheModuleOptions {
  /**
   * Global cache options
   */
  global?: boolean;
  
  /**
   * Cache options
   */
  cache?: PgCacheOptions;
}