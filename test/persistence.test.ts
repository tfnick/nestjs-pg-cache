import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Persistence Test', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_persistence';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: TEST_URI,
            table: TEST_TABLE,
            useUnloggedTable: false,
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

  it('should persist data immediately after set', async () => {
    // 设置数据
    const setResult = await cacheService.set('test:persistence', 'persistent_value');
    console.log('Set result:', setResult);
    expect(setResult).toBe('OK');

    // 立即检查数据库中的数据
    const store = (cacheService as any).cache?.opts?.store;
    if (store && typeof store.query === 'function') {
      try {
        const rows = await store.query(`SELECT key, value FROM ${store.opts.schema || 'public'}.${store.opts.table || 'keyv'} WHERE key LIKE '%test:%'`);
        console.log('Rows in database after set:', rows);
        
        // 验证数据确实持久化到数据库
        expect(rows.length).toBeGreaterThan(0);
        
        // 查找我们设置的键
        const testRow = rows.find((row: any) => row.key.includes('test:persistence'));
        expect(testRow).toBeDefined();
        
        if (testRow) {
          console.log('Found persisted key:', testRow.key);
          console.log('Found persisted value:', testRow.value);
        }
      } catch (error) {
        console.error('Error querying database:', error);
      }
    }

    // 验证可以重新获取数据
    const getValue = await cacheService.get('test:persistence');
    console.log('Get result:', getValue);
    expect(getValue).toBe('persistent_value');
  });

  it('should persist multiple keys correctly', async () => {
    // 设置多个键值对
    await cacheService.set('user:1', { id: 1, name: 'Alice' });
    await cacheService.set('user:2', { id: 2, name: 'Bob' });
    await cacheService.set('session:abc', { token: 'xyz123' });

    // 检查数据库中的所有数据
    const store = (cacheService as any).cache?.opts?.store;
    if (store && typeof store.query === 'function') {
      try {
        const allRows = await store.query(`SELECT key, value FROM ${store.opts.schema || 'public'}.${store.opts.table || 'keyv'} ORDER BY key`);
        console.log('All rows in database:', allRows);
        
        expect(allRows.length).toBe(3);
        
        // 验证每个键都存在
        const keys = allRows.map((row: any) => row.key);
        console.log('Keys in database:', keys);
        
        // 注意：由于 Keyv 会添加前缀，实际键名可能不同
        const hasUser1 = keys.some((k: any) => k.includes('user:1'));
        const hasUser2 = keys.some((k: any) => k.includes('user:2'));
        const hasSession = keys.some((k: any) => k.includes('session:abc'));
        
        expect(hasUser1).toBe(true);
        expect(hasUser2).toBe(true);
        expect(hasSession).toBe(true);
      } catch (error) {
        console.error('Error querying database:', error);
      }
    }

    // 验证数据一致性
    const user1 = await cacheService.get('user:1');
    const user2 = await cacheService.get('user:2');
    const session = await cacheService.get('session:abc');
    
    expect(user1).toEqual({ id: 1, name: 'Alice' });
    expect(user2).toEqual({ id: 2, name: 'Bob' });
    expect(session).toEqual({ token: 'xyz123' });
  });
});