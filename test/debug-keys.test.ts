import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Debug Keys', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_debug_keys';

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

  it('should debug key storage and retrieval', async () => {
    // 检查缓存服务的内部结构
    const cache = (cacheService as any).cache;
    console.log('Cache opts:', JSON.stringify(cache?.opts, null, 2));
    console.log('Options namespace:', (cacheService as any).options?.namespace);

    // 设置测试数据
    console.log('Setting key: user:123');
    await cacheService.set('user:123', { name: 'Alice' });
    
    // 获取数据验证存储
    console.log('Getting key: user:123');
    const value = await cacheService.get('user:123');
    console.log('Retrieved value:', JSON.stringify(value));

    // 尝试精确匹配
    console.log('Testing exact key match: user:123');
    const exactKeys = await cacheService.keys('user:123');
    console.log('Exact match result:', exactKeys);

    // 尝试通配符匹配
    console.log('Testing wildcard match: user:*');
    const wildcardKeys = await cacheService.keys('user:*');
    console.log('Wildcard match result:', wildcardKeys);

    // 检查底层存储结构
    const store = cache?.opts?.store;
    console.log('Store exists:', !!store);
    console.log('Store type:', typeof store);
    console.log('Store query function type:', typeof store?.query);
    
    if (store && store.opts) {
      console.log('Store options:', JSON.stringify(store.opts, null, 2));
      try {
        const allRows = await store.query(`SELECT key, value FROM ${store.opts.schema}.${store.opts.table}`);
        console.log('All rows in database:', allRows);
      } catch (error) {
        console.log('Error querying all rows:', error.message);
      }
    }
  });
});