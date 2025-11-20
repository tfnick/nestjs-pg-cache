import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import PostgresStore from "@keyv/postgres";

describe('PgCacheService Pre-created Store Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('=== 开始初始化测试模块（预创建store） ===');
    
    // 预创建store实例
    const postgresStore = new PostgresStore({
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'keyv_cache_precreated',
      useUnloggedTable: false,
      // 注意：不要在这里设置namespace，让PgCacheService来处理
    });
    
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            ttl: 60000, // 1分钟
            store: postgresStore,
            namespace: '', // 在这里设置namespace
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    console.log('=== 服务初始化完成 ===');
    
    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (service) {
      try {
        await service.reset();
      } catch (error) {
        console.warn('清理缓存时出错:', error);
      }
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清空缓存
    try {
      await service.reset();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn('清理缓存失败:', error);
    }
  });

  describe('基础缓存操作', () => {
    it('应该能够设置和获取字符串值', async () => {
      const key = 'precreated:string:' + Date.now();
      const value = 'Hello, World!';
      
      console.log('\n=== 测试字符串缓存 ===');
      console.log('键:', key);
      console.log('值:', value);

      // 设置值
      console.log('开始设置...');
      const setResult = await service.set(key, value);
      console.log('设置结果:', setResult);
      expect(setResult).toBe('OK');

      // 等待确保写入完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 获取值
      console.log('开始获取...');
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      expect(getResult).toBe(value);
      console.log('✓ 字符串测试通过');
    });

    it('应该能够设置和获取对象值', async () => {
      const key = 'precreated:object:' + Date.now();
      const value = { id: 1, name: 'Test User', active: true };
      
      console.log('\n=== 测试对象缓存 ===');
      console.log('键:', key);
      console.log('值:', value);

      // 设置值
      console.log('开始设置对象...');
      const setResult = await service.set(key, value);
      console.log('设置结果:', setResult);
      expect(setResult).toBe('OK');

      // 等待确保写入完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 获取值
      console.log('开始获取对象...');
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      expect(getResult).toEqual(value);
      console.log('✓ 对象测试通过');
    });
  });
});