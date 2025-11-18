import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Simple Keys Test', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_simple_keys';

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

  it('should test right-side wildcard pattern matching', async () => {
    // 设置测试数据
    await cacheService.set('user:123', 'user123');
    await cacheService.set('user:456', 'user456');
    await cacheService.set('session:abc', 'sessionabc');

    // 检查实际的存储方式
    const cache = (cacheService as any).cache;
    const store = cache?.opts?.store;
    // if (store) {
    //   const allRows = await store.query(`SELECT key, value FROM ${store.opts.schema}.${store.opts.table}`);
    // }

    // 测试精确匹配
    const exactResult = await cacheService.keys('user:123');
    console.log('Exact match for user:123:', exactResult);

    // 测试右侧通配符
    const wildcardResult = await cacheService.keys('user:*');
    console.log('Wildcard match for user:*:', wildcardResult);

    // 验证结果
    expect(exactResult).toEqual(['user:123']);
    expect(wildcardResult).toContain('user:123');
    expect(wildcardResult).toContain('user:456');
    expect(wildcardResult).toHaveLength(2);

    // 测试其他模式
    const sessionResult = await cacheService.keys('session:*');
    expect(sessionResult).toEqual(['session:abc']);

    // 测试无匹配模式
    const noMatchResult = await cacheService.keys('product:*');
    expect(noMatchResult).toEqual([]);
  });
});