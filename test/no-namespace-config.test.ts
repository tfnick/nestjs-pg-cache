import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('No Namespace Config Test', () => {
  let module: TestingModule;
  let cacheService: PgCacheService;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'keyv_cache'; // 你的表名

  afterEach(async () => {
    if (module) {
      await cacheService.reset();
      await module.close();
    }
  });

  it('should work with no namespace (like your config)', async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          global: true,
          useFactory: () => {
            // 模拟你的配置
            return {
              cache: {
                uri: TEST_URI,
                table: TEST_TABLE,
                useUnloggedTable: false,
                ttl: 3600000, // 1小时
                // 注意：没有 namespace 配置
              },
            };
          },
        }),
      ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);
    
    // 测试基本 set/get 功能
    console.log('Testing basic set/get...');
    const setResult = await cacheService.set('test:key', 'test_value');
    console.log('Set result:', setResult);
    
    const getValue = await cacheService.get('test:key');
    console.log('Get result:', getValue);
    
    expect(setResult).toBe('OK');
    expect(getValue).toBe('test_value');

    // 检查缓存选项
    const options = (cacheService as any).options;
    console.log('Cache options:', options);

    // 尝试检查数据库表
    const store = (cacheService as any).cache?.opts?.store;
    if (store && typeof store.query === 'function') {
      try {
        const rows = await store.query(`SELECT COUNT(*) as count FROM ${store.opts.schema || 'public'}.${store.opts.table || 'keyv'}`);
        console.log('Table exists and has rows:', rows[0]?.count);
        expect(rows[0]?.count).toBeGreaterThan(0);
      } catch (error) {
        console.error('Error checking table:', error);
        
        // 尝试列出所有表
        try {
          const tables = await store.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%keyv%'`);
          console.log('Keyv-related tables:', tables.map((t: any) => t.table_name));
        } catch (tableError) {
          console.error('Error listing tables:', tableError);
        }
      }
    }

    // 测试通配符功能
    console.log('Testing wildcard keys...');
    await cacheService.set('user:1', 'user1');
    await cacheService.set('user:2', 'user2');
    
    const userKeys = await cacheService.keys('user:*');
    console.log('Wildcard result for user:*:', userKeys);
    
    expect(userKeys).toContain('user:1');
    expect(userKeys).toContain('user:2');
  });

  it('should work with empty namespace (explicit)', async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          global: true,
          useFactory: () => {
            return {
              cache: {
                uri: TEST_URI,
                table: TEST_TABLE + '_explicit',
                useUnloggedTable: false,
                ttl: 3600000,
                namespace: '', // 明确设置为空字符串
              },
            };
          },
        }),
      ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);
    
    const setResult = await cacheService.set('explicit:test', 'explicit_value');
    const getValue = await cacheService.get('explicit:test');
    
    expect(setResult).toBe('OK');
    expect(getValue).toBe('explicit_value');
    
    console.log('✅ Empty namespace config works');
  });
});