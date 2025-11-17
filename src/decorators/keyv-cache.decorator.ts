import { Inject } from '@nestjs/common';
import { PgCacheService } from './../services/pg-cache.service';
import { paramsKeyFormat } from './../utils/params-key-format';

/**
 * 缓存清除注解 - 用于方法执行后清除缓存
 * @param CACHE_NAME 缓存名称前缀
 * @param CACHE_KEY 缓存键模板，支持 {{0}}、{{1}} 等参数占位符
 */
export function CacheEvict(CACHE_NAME: string, CACHE_KEY: string) {
  const injectCache = Inject(PgCacheService);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectCache(target, 'cacheService');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取注入的缓存服务
      const cacheService: PgCacheService = (this as any).cacheService;
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      // 执行原始方法
      const result = await originMethod.apply(this, args);

      // 清除缓存
      if (key === '*') {
        // 清除所有以 CACHE_NAME 开头的缓存
        // 注意：keyv 不支持 pattern 删除，这里需要特殊处理
        // 暂时不支持通配符删除，需要扩展功能
        console.warn('Wildcard cache eviction is not fully supported by keyv');
      } else if (key !== null) {
        await cacheService.del(`${CACHE_NAME}${key}`);
      } else {
        await cacheService.del(`${CACHE_NAME}${CACHE_KEY}`);
      }

      return result;
    };
  };
}

/**
 * 缓存注解 - 用于方法结果缓存
 * @param CACHE_NAME 缓存名称前缀
 * @param CACHE_KEY 缓存键模板，支持 {{0}}、{{1}} 等参数占位符
 * @param CACHE_EXPIRESIN 缓存过期时间（毫秒）
 */
export function Cacheable(CACHE_NAME: string, CACHE_KEY: string, CACHE_EXPIRESIN?: number) {
  const injectCache = Inject(PgCacheService);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectCache(target, 'cacheService');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取注入的缓存服务
      const cacheService: PgCacheService = (this as any).cacheService;
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      if (key === null) {
        return await originMethod.apply(this, args);
      }

      const fullKey = `${CACHE_NAME}${key}`;
      
      // 尝试从缓存获取
      const cacheResult = await cacheService.get(fullKey);

      if (cacheResult !== undefined) {
        return cacheResult;
      }

      // 缓存未命中，执行原始方法
      const result = await originMethod.apply(this, args);

      // 将结果存入缓存
      await cacheService.set(fullKey, result, CACHE_EXPIRESIN);

      return result;
    };
  };
}

/**
 * 缓存更新注解 - 用于方法执行后更新缓存
 * @param CACHE_NAME 缓存名称前缀
 * @param CACHE_KEY 缓存键模板
 * @param CACHE_EXPIRESIN 缓存过期时间（毫秒）
 */
export function CachePut(CACHE_NAME: string, CACHE_KEY: string, CACHE_EXPIRESIN?: number) {
  const injectCache = Inject(PgCacheService);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectCache(target, 'cacheService');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取注入的缓存服务
      const cacheService: PgCacheService = (this as any).cacheService;
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      // 执行原始方法
      const result = await originMethod.apply(this, args);

      // 更新缓存
      if (key !== null) {
        await cacheService.set(`${CACHE_NAME}${key}`, result, CACHE_EXPIRESIN);
      }

      return result;
    };
  };
}

/**
 * 缓存条件注解 - 有条件地缓存方法结果
 * @param CACHE_NAME 缓存名称前缀
 * @param CACHE_KEY 缓存键模板
 * @param condition 缓存条件函数
 * @param CACHE_EXPIRESIN 缓存过期时间（毫秒）
 */
export function CacheConditional(
  CACHE_NAME: string, 
  CACHE_KEY: string, 
  condition: (result: any, args: any[]) => boolean,
  CACHE_EXPIRESIN?: number
) {
  const injectCache = Inject(PgCacheService);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectCache(target, 'cacheService');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取注入的缓存服务
      const cacheService: PgCacheService = (this as any).cacheService;
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      if (key === null) {
        return await originMethod.apply(this, args);
      }

      const fullKey = `${CACHE_NAME}${key}`;
      
      // 尝试从缓存获取
      const cacheResult = await cacheService.get(fullKey);

      if (cacheResult !== undefined) {
        return cacheResult;
      }

      // 缓存未命中，执行原始方法
      const result = await originMethod.apply(this, args);

      // 检查条件，决定是否缓存
      if (condition(result, args)) {
        await cacheService.set(fullKey, result, CACHE_EXPIRESIN);
      }

      return result;
    };
  };
}