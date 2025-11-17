import { PgCacheService } from '../services/pg-cache.service';

/**
 * 通配符缓存删除支持
 * 注意：由于 keyv 不支持 pattern 匹配，需要通过其他方式实现
 */
export class WildcardCacheSupport {
  constructor(private readonly cacheService: PgCacheService) {}

  /**
   * 删除匹配指定模式的所有缓存
   * @param pattern 模式，支持 * 通配符
   * @returns 删除的缓存数量
   */
  async deleteByPattern(pattern: string): Promise<number> {
    // 由于 keyv 本身不支持 pattern 查询，这里提供一些替代方案
    
    // 方案1：如果使用固定的命名空间，可以手动跟踪缓存键
    // 方案2：如果缓存键有规律，可以批量删除
    // 方案3：如果需要全模式匹配，可能需要额外的元数据存储
    
    console.warn('Wildcard pattern deletion is not fully supported by keyv. Consider using namespaced keys or implementing a custom tracking mechanism.');
    
    // 简单实现：如果 pattern 是特定前缀，可以遍历删除（需要扩展缓存服务）
    // 这里暂时返回0，表示不支持完整的通配符删除
    return 0;
  }

  /**
   * 获取所有缓存键（需要扩展实现）
   */
  async getAllKeys(): Promise<string[]> {
    // 需要扩展 PgCacheService 来支持获取所有键
    // 这通常需要直接访问底层存储
    console.warn('Getting all keys is not supported by keyv by default');
    return [];
  }
}