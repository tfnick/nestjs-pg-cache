import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PgCacheService } from './services/pg-cache.service';
import { PG_CACHE_MODULE_OPTIONS, PG_CACHE_TOKEN } from './constants';
import { PgCacheModuleOptions, PgCacheOptions } from './interfaces/pg-cache-options.interface';
import type PostgresStore from '@keyv/postgres';

@Module({})
export class PgCacheModule {
  static forRoot(options: PgCacheModuleOptions = {}): DynamicModule {
    const cacheOptions = this.createCacheOptions(options.cache);
    
    const providers: Provider[] = [
      {
        provide: PG_CACHE_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: PG_CACHE_TOKEN,
        useValue: cacheOptions,
      },
      PgCacheService,
    ];

    return {
      module: PgCacheModule,
      providers: providers,
      exports: [PgCacheService],
      global: options.global || false,
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<PgCacheModuleOptions> | Promise<{ cache?: PgCacheOptions; global?: boolean }> | PgCacheModuleOptions | { cache?: PgCacheOptions; global?: boolean };
    inject?: any[];
    global?: boolean;
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: PG_CACHE_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: PG_CACHE_TOKEN,
        useFactory: async (moduleOptions: PgCacheModuleOptions | { cache?: PgCacheOptions; global?: boolean }) => {
          // 支持多种配置格式：
          // 1. 直接包含cache属性的PgCacheModuleOptions
          // 2. 包含cache和global属性的对象
          // 3. 直接传入PgCacheOptions
          if (moduleOptions && typeof moduleOptions === 'object') {
            if ('cache' in moduleOptions) {
              return this.createCacheOptions(moduleOptions.cache);
            } else if ('uri' in moduleOptions || 'store' in moduleOptions) {
              // 直接传入的是PgCacheOptions
              return this.createCacheOptions(moduleOptions as PgCacheOptions);
            }
          }
          
          // 默认情况
          return this.createCacheOptions({});
        },
        inject: [PG_CACHE_MODULE_OPTIONS],
      },
      PgCacheService,
    ];

    // 需要根据配置动态决定global属性
    const global = options.global !== undefined ? options.global : false;

    return {
      module: PgCacheModule,
      providers: providers,
      exports: [PgCacheService],
      global: global,
    };
  }

  private static createCacheOptions(options?: PgCacheOptions): PgCacheOptions {
    // If a custom store is provided, use it directly
    if (options?.store) {
      return options;
    }

    // Otherwise create a default configuration
    return {
      uri: options?.uri || process.env.DATABASE_URL,
      table: options?.table,
      namespace: options?.namespace,
      ttl: options?.ttl,
      compression: options?.compression,
      serialize: options?.serialize,
      deserialize: options?.deserialize,
      useUnloggedTable: options?.useUnloggedTable,
      store: options?.store,
    };
  }
}