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
    useFactory: (...args: any[]) => Promise<PgCacheModuleOptions> | PgCacheModuleOptions;
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
        useFactory: async (moduleOptions: PgCacheModuleOptions) => {
          return this.createCacheOptions(moduleOptions.cache);
        },
        inject: [PG_CACHE_MODULE_OPTIONS],
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
      store: options?.store,
    };
  }
}