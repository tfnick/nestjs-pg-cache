import { Injectable, Inject, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PgCacheService } from '../services/pg-cache.service';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    @Inject(PgCacheService) private readonly cacheService: PgCacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const method = context.getHandler();
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, method);
    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, method);

    // If no cache key is set, skip caching
    if (!cacheKey) {
      return next.handle();
    }

    // Try to get cached data
    const cachedData = await this.cacheService.get(cacheKey);
    
    if (cachedData !== undefined) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return of(cachedData);
    }

    this.logger.debug(`Cache miss for key: ${cacheKey}`);

    // If not cached, execute the method and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.cacheService.set(cacheKey, data, cacheTTL);
          this.logger.debug(`Cached data for key: ${cacheKey}`);
        } catch (error) {
          this.logger.error(`Failed to cache data for key: ${cacheKey}`, error);
        }
      }),
    );
  }
}