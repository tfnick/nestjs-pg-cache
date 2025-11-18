import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Debug Wildcard', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_debug_wildcard';

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

  it('should debug wildcard matching', async () => {
    // 设置测试数据
    console.log('Setting test data...');
    await cacheService.set('user:123', 'test1');
    await cacheService.set('user:456', 'test2');

    // 检查实际存储的数据
    const cache = (cacheService as any).cache;
    const store = cache?.opts?.store;
    console.log('Store exists:', !!store);
    console.log('Store opts:', store?.opts);
    
    if (store && typeof store.query === 'function') {
      try {
        const allRows = await store.query(`SELECT key, value FROM ${store.opts.schema || 'public'}.${store.opts.table || 'keyv'}`);
        console.log('All rows in database:', allRows);
      } catch (error) {
        console.error('Error querying all rows:', error);
      }

      // 测试不同的查询模式
      const patterns = [
        'user:%',
        'keyv:user:%',
        'keyv:testns:user:%'
      ];

      for (const pattern of patterns) {
        try {
          const rows = await store.query(`SELECT key FROM ${store.opts.schema || 'public'}.${store.opts.table || 'keyv'} WHERE key LIKE $1`, [pattern]);
          console.log(`Pattern "${pattern}" found:`, rows.map((row: any) => row.key));
        } catch (error) {
          console.error(`Error with pattern "${pattern}":`, error);
        }
      }
    }

    // 测试精确匹配
    console.log('Testing exact match...');
    const exactResult = await cacheService.keys('user:123');
    console.log('Exact match result:', exactResult);

    // 测试通配符匹配
    console.log('Testing wildcard match...');
    const wildcardResult = await cacheService.keys('user:*');
    console.log('Wildcard match result:', wildcardResult);
  });
});