import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import Keyv from 'keyv';
import PostgresStore from '@keyv/postgres';

describe('Diagnostic Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('\n=== 诊断测试开始 ===');
    
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'keyv_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    
    // 等待初始化完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 诊断Keyv配置
    const cacheClient = (service as any).cache;
    console.log('Cache 实例类型:', cacheClient.constructor.name);
    console.log('Cache opts:', JSON.stringify(cacheClient.opts, null, 2));
    
    // 检查是否有PostgreSQL存储
    const store = cacheClient.opts?.store;
    if (store) {
      console.log('Store 类型:', store.constructor.name);
      console.log('Store opts:', JSON.stringify(store.opts || {}, null, 2));
      
      // 尝试直接连接数据库
      try {
        if (typeof store.connect === 'function') {
          const query = await store.connect();
          console.log('数据库连接成功');
          
          // 检查表是否存在
          const tableCheck = await query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'keyv_cache'
            )
          `);
          console.log('表存在检查:', tableCheck);
          
        } else if (typeof store.query === 'function') {
          console.log('Store 有 query 方法');
        }
      } catch (error) {
        console.error('数据库连接失败:', error);
      }
    } else {
      console.log('⚠️  没有找到 Store，可能在使用内存存储');
    }
    
    console.log('=== 诊断信息收集完成 ===\n');
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  it('诊断数据存储问题', async () => {
    const key = 'diagnostic:test:' + Date.now();
    const value = 'Diagnostic Test Value';
    
    console.log('\n=== 数据存储诊断 ===');
    
    // 尝试直接使用PostgresStore进行测试
    console.log('1. 测试直接PostgresStore...');
    try {
      const directStore = new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'keyv_cache_diagnostic',
        useUnloggedTable: false
      });
      
      const directKeyv = new Keyv({ store: directStore });
      await directKeyv.set('direct_test', 'direct_value');
      const directResult = await directKeyv.get('direct_test');
      console.log('直接PostgresStore测试结果:', directResult);
      expect(directResult).toBe('direct_value');
      
    } catch (error) {
      console.error('直接PostgresStore测试失败:', error);
    }
    
    // 测试PgCacheService
    console.log('2. 测试PgCacheService...');
    const setResult = await service.set(key, value);
    console.log('PgCacheService设置结果:', setResult);
    expect(setResult).toBe('OK');
    
    // 等待写入
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const getResult = await service.get(key);
    console.log('PgCacheService获取结果:', getResult);
    expect(getResult).toBe(value);
    
    console.log('✓ 诊断测试完成');
  });
});