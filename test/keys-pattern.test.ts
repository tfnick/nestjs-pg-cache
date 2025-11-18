import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Keys Pattern Matching', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_keys_pattern';

  beforeAll(async () => {
    module = await Test.createTestingModule({
    imports: [
      PgCacheModule.forRoot({
        cache: {
          uri: TEST_URI,
          table: TEST_TABLE,
          useUnloggedTable: true,
        },
      }),
    ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);
  });

  afterAll(async () => {
    await cacheService.reset();
    await module.close();
  });

  beforeEach(async () => {
    await cacheService.reset();
  });

  describe('keys method with right-side wildcard', () => {
    it('should handle exact key match (no wildcard)', async () => {
      // 设置测试数据
      await cacheService.set('user:123', { name: 'Alice' });
      await cacheService.set('user:456', { name: 'Bob' });

      // 测试精确匹配
      const keys = await cacheService.keys('user:123');
      expect(keys).toEqual(['user:123']);
    });

    it('should handle non-existent exact key', async () => {
      const keys = await cacheService.keys('nonexistent');
      expect(keys).toEqual([]);
    });

    it('should support right-side wildcard with colon separator', async () => {
      // 设置测试数据
      await cacheService.set('user:123', { name: 'Alice' });
      await cacheService.set('user:456', { name: 'Bob' });
      await cacheService.set('session:abc', { token: 'xyz' });
      await cacheService.set('product:789', { price: 100 });

      // 测试右侧通配符
      const userKeys = await cacheService.keys('user:*');
      expect(userKeys).toContain('user:123');
      expect(userKeys).toContain('user:456');
      expect(userKeys).toHaveLength(2);

      const sessionKeys = await cacheService.keys('session:*');
      expect(sessionKeys).toEqual(['session:abc']);

      const productKeys = await cacheService.keys('product:*');
      expect(productKeys).toEqual(['product:789']);
    });

    it('should support right-side wildcard without separator', async () => {
      // 设置测试数据
      await cacheService.set('test123', { value: 1 });
      await cacheService.set('test456', { value: 2 });
      await cacheService.set('other123', { value: 3 });

      // 测试右侧通配符
      const testKeys = await cacheService.keys('test*');
      expect(testKeys).toContain('test123');
      expect(testKeys).toContain('test456');
      expect(testKeys).toHaveLength(2);

      const otherKeys = await cacheService.keys('other*');
      expect(otherKeys).toEqual(['other123']);
    });

    it('should return empty array for non-matching patterns', async () => {
      // 设置测试数据
      await cacheService.set('user:123', { name: 'Alice' });

      // 测试不匹配的模式
      const keys = await cacheService.keys('product:*');
      expect(keys).toEqual([]);
    });

    it('should handle empty result set', async () => {
      // 在空的缓存中测试
      const keys = await cacheService.keys('user:*');
      expect(keys).toEqual([]);
    });

    it('should warn about unsupported patterns', async () => {
      // 设置测试数据
      await cacheService.set('user:123', { name: 'Alice' });

      // 测试左侧通配符（应该不支持）
      const leftWildcardKeys = await cacheService.keys('*:123');
      expect(leftWildcardKeys).toEqual([]);

      // 测试中间通配符（应该不支持）
      const middleWildcardKeys = await cacheService.keys('user:*:456');
      expect(middleWildcardKeys).toEqual([]);
    });

    it('should handle namespace properly', async () => {
      // 创建带 namespace 的缓存服务
      const namespacedModule = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              uri: TEST_URI,
              table: TEST_TABLE + '_namespace',
              namespace: 'testns',
              useUnloggedTable: true,
            },
          }),
        ],
      }).compile();

      const namespacedCache = namespacedModule.get<PgCacheService>(PgCacheService);

      try {
        // 设置测试数据
        await namespacedCache.set('user:123', { name: 'Alice' });
        await namespacedCache.set('user:456', { name: 'Bob' });

        // 测试带 namespace 的 keys
        const keys = await namespacedCache.keys('user:*');
        expect(keys).toContain('user:123');
        expect(keys).toContain('user:456');
        expect(keys).toHaveLength(2);
      } finally {
        await namespacedCache.reset();
        await namespacedModule.close();
      }
    });

    it('should handle string values correctly', async () => {
      // 测试字符串类型的值
      await cacheService.set('str:67', '67');
      await cacheService.set('num:67', 67);

      const strKeys = await cacheService.keys('str:*');
      expect(strKeys).toEqual(['str:67']);

      const numKeys = await cacheService.keys('num:*');
      expect(numKeys).toEqual(['num:67']);

      // 验证值的类型保持
      const strValue = await cacheService.get('str:67');
      const numValue = await cacheService.get('num:67');
      
      expect(typeof strValue).toBe('string');
      expect(strValue).toBe('67');
      expect(typeof numValue).toBe('number');
      expect(numValue).toBe(67);
    });
  });
});