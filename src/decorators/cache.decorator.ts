import { SetMetadata, applyDecorators } from '@nestjs/common';

/**
 * Cache key metadata
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Decorator to set cache key for method
 */
export function CacheKey(key: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
  };
}

/**
 * Decorator to set cache TTL for method
 */
export function CacheTTL(ttl: number): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
  };
}

/**
 * Combined decorator for cache configuration
 */
export function CacheConfig(key: string, ttl?: number): MethodDecorator {
  const decorators: MethodDecorator[] = [
    CacheKey(key)
  ];
  
  if (ttl !== undefined) {
    decorators.push(CacheTTL(ttl));
  }
  
  return applyDecorators(...decorators);
}