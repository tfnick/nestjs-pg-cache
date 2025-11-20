import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Check Store Methods', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'check_store_methods';

  afterAll(async () => {
    if (module) {
      await cacheService.reset();
      await module.close();
    }
  });

  it('should check available store methods', async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          useFactory: () => ({
            cache: {
              uri: TEST_URI,
              namespace: '',
              table: TEST_TABLE,
              useUnloggedTable: false,
              ttl: 3600000,
            },
          }),
        }),
      ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);

    // 获取不同层级的对象
    const service = cacheService as any;
    const cache = service.cache;
    const keyvOpts = cache?.opts;
    const store = keyvOpts?.store;

    console.log('=== Checking Store Methods ===');
    console.log('Service type:', typeof service);
    console.log('Cache type:', typeof cache);
    console.log('Keyv options type:', typeof keyvOpts);
    console.log('Store type:', typeof store);
    console.log('Store constructor:', store?.constructor?.name);

    // 检查 store 上的所有方法
    if (store) {
      console.log('\nStore properties:');
      console.log('- query:', typeof store.query);
      console.log('- connect:', typeof store.connect);
      console.log('- opts:', typeof store.opts);
      
      console.log('\nStore methods:');
      const methods = Object.getOwnPropertyNames(store)
        .filter(name => typeof store[name] === 'function')
        .slice(0, 10); // 只显示前10个
      
      methods.forEach((method, index) => {
        console.log(`[${index}] ${method}`);
      });

      // 尝试不同的查询方式
      console.log('\nTesting different query approaches:');
      
      // 1. 直接 query
      if (typeof store.query === 'function') {
        console.log('✅ store.query is available');
      } else {
        console.log('❌ store.query is NOT available');
      }

      // 2. connect() 方法
      if (typeof store.connect === 'function') {
        console.log('✅ store.connect is available');
        try {
          const queryFn = await store.connect();
          console.log('✅ store.connect() returned query function, type:', typeof queryFn);
          
          // 测试查询
          if (typeof queryFn === 'function') {
            try {
              const testQuery = await queryFn('SELECT 1 as test');
              console.log('✅ Query function works, result:', testQuery);
            } catch (queryError) {
              console.log('❌ Query function failed:', queryError.message);
            }
          }
        } catch (connectError) {
          console.log('❌ store.connect() failed:', connectError.message);
        }
      } else {
        console.log('❌ store.connect is NOT available');
      }

      // 3. 检查 cache 的查询方法
      if (typeof cache.query === 'function') {
        console.log('✅ cache.query is available');
      } else {
        console.log('❌ cache.query is NOT available');
      }

      // 4. 检查其他可能的查询方法
      console.log('\nChecking other possible query methods:');
      const possibleMethods = ['executeSQL', 'sql', 'db', 'client', 'pool'];
      possibleMethods.forEach(method => {
        if (store[method] && typeof store[method] === 'function') {
          console.log(`✅ store.${method} is available`);
        }
      });

      // 5. 检查是否有其他内部属性
      console.log('\nChecking internal structure:');
      console.log('store.opts:', store.opts);
      console.log('store.ttlSupport:', store.ttlSupport);
      console.log('store.namespace:', store.namespace);
    }

    // 测试基本缓存操作
    console.log('\n=== Testing Basic Operations ===');
    try {
      const setResult = await cacheService.set('test', 'value');
      console.log('Set result:', setResult);
      
      const getValue = await cacheService.get('test');
      console.log('Get result:', getValue);
      
      if (setResult === 'OK' && getValue === 'value') {
        console.log('✅ Basic cache operations work despite query issues');
      }
    } catch (opError) {
      console.error('❌ Cache operations failed:', opError);
    }
  });
});