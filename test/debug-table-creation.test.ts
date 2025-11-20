import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Debug Table Creation', () => {
  let module: TestingModule;
  let cacheService: PgCacheService;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'keyv_cache';

  afterEach(async () => {
    if (module) {
      await cacheService.reset();
      await module.close();
    }
  });

  it('should debug exact business configuration', async () => {
    console.log('=== Debugging Exact Business Configuration ===');
    
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          global: true,
          useFactory: () => {
            // 完全复制你的配置
            return {
              cache: {
                uri: TEST_URI,
                namespace: '',
                table: TEST_TABLE,
                useUnloggedTable: false,
                ttl: 3600000, // 1小时
              },
            };
          },
        }),
      ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);

    // 获取实际的缓存配置
    const cacheOptions = (cacheService as any).options;
    console.log('Cache options from service:', JSON.stringify(cacheOptions, null, 2));

    // 获取实际的 Keyv 配置
    const cache = (cacheService as any).cache;
    const keyvOptions = cache?.opts;
    console.log('Keyv options:', JSON.stringify(keyvOptions, null, 2));

    // 获取 store 信息
    const store = keyvOptions?.store;
    console.log('Store exists:', !!store);
    if (store) {
      console.log('Store options:', JSON.stringify(store.opts, null, 2));
      console.log('Store type:', store.constructor.name);
    }

    // 尝试设置一个值看是否成功
    console.log('Testing set operation...');
    try {
      const setResult = await cacheService.set('debug:test', 'debug_value');
      console.log('Set result:', setResult);
      
      const getValue = await cacheService.get('debug:test');
      console.log('Get result:', getValue);
      
      if (setResult === 'OK' && getValue === 'debug_value') {
        console.log('✅ Basic cache operations work');
        
        // 检查数据库表
        if (store && typeof store.query === 'function') {
          try {
            // 检查表是否存在
            const tableCheck = await store.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${TEST_TABLE}'
            `);
            console.log('Table exists check:', tableCheck);

            // 检查表中的数据
            if (tableCheck.length > 0) {
              const dataCheck = await store.query(`
                SELECT COUNT(*) as count 
                FROM ${store.opts.schema || 'public'}.${TEST_TABLE}
              `);
              console.log('Table data count:', dataCheck[0]?.count);

              // 列出所有 keyv 相关的表
              const allTables = await store.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%keyv%'
              `);
              console.log('All keyv tables:', allTables.map((t: any) => t.table_name));
            }
          } catch (dbError) {
            console.error('Database error:', dbError);
          }
        }
      } else {
        console.error('❌ Basic cache operations failed');
      }
    } catch (error) {
      console.error('❌ Cache operation error:', error);
    }
  });

  it('should test different namespace values', async () => {
    console.log('=== Testing Different Namespace Values ===');
    
    const testCases = [
      { namespace: '', desc: 'Empty string' },
      { namespace: undefined, desc: 'Undefined' },
      { namespace: 'cache', desc: 'String "cache"' },
    ];

    for (const testCase of testCases) {
      console.log(`\n--- Testing ${testCase.desc} ---`);
      
      try {
        const testModule = await Test.createTestingModule({
          imports: [
            PgCacheModule.forRootAsync({
              global: true,
              useFactory: () => ({
                cache: {
                  uri: TEST_URI,
                  table: `${TEST_TABLE}_${testCase.desc.replace(/\s+/g, '_')}`,
                  useUnloggedTable: false,
                  ttl: 3600000,
                  namespace: testCase.namespace,
                },
              }),
            }),
          ],
        }).compile();

        const testCache = testModule.get<PgCacheService>(PgCacheService);
        
        const setResult = await testCache.set('ns_test', 'ns_value');
        const getValue = await testCache.get('ns_test');
        
        console.log(`${testCase.desc} - Set: ${setResult}, Get: ${getValue}`);
        
        if (setResult === 'OK' && getValue === 'ns_value') {
          console.log(`✅ ${testCase.desc} works`);
          
          const testStore = (testCache as any).cache?.opts?.store;
          if (testStore && typeof testStore.query === 'function') {
            try {
              const tableInfo = await testStore.query(`
                SELECT COUNT(*) as count 
                FROM ${testStore.opts.schema || 'public'}.${testStore.opts.table || 'keyv'}
              `);
              console.log(`${testCase.desc} - Table has ${tableInfo[0]?.count} rows`);
            } catch (dbError) {
              console.log(`${testCase.desc} - DB error:`, (dbError as Error).message);
            }
          }
        } else {
          console.log(`❌ ${testCase.desc} failed`);
        }
        
        await testCache.reset();
        await testModule.close();
      } catch (error) {
        console.log(`❌ ${testCase.desc} exception:`, (error as Error).message);
      }
    }
  });
});