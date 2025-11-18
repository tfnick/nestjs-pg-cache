import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('UseUnloggedTable Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  describe('useUnloggedTable: false', () => {
    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
              table: 'logged_cache_test',
              useUnloggedTable: false, // 明确设置为 false
              ttl: 60000
            }
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);
      
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

    it('应该能够正常使用 logged 表进行缓存操作', async () => {
      console.log('\n=== 测试 useUnloggedTable: false ===');
      
      const key = 'logged:test:' + Date.now();
      const value = 'Logged Table Test';
      
      console.log('设置键值:', { key, value });
      
      // 设置值
      const setResult = await service.set(key, value);
      console.log('设置结果:', setResult);
      expect(setResult).toBe('OK');
      
      // 等待确保写入完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 获取值
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      expect(getResult).toBe(value);
      console.log('✓ useUnloggedTable: false 测试通过');
    });

    it('应该能够缓存对象数据', async () => {
      const key = 'logged:object:' + Date.now();
      const value = {
        message: 'Logged Object Test',
        timestamp: Date.now(),
        config: { useUnloggedTable: false }
      };
      
      console.log('\n=== 测试 logged 表对象缓存 ===');
      console.log('键:', key);
      console.log('值:', value);

      // 设置对象
      const setResult = await service.set(key, value);
      expect(setResult).toBe('OK');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 获取对象
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      
      expect(getResult).toEqual(value);
      console.log('✓ logged 表对象缓存测试通过');
    });
  });

  describe('useUnloggedTable: true', () => {
    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
              table: 'unlogged_cache_test',
              useUnloggedTable: true, // 设置为 true
              ttl: 60000
            }
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);
      
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

    it('应该能够正常使用 unlogged 表进行缓存操作', async () => {
      console.log('\n=== 测试 useUnloggedTable: true ===');
      
      const key = 'unlogged:test:' + Date.now();
      const value = 'Unlogged Table Test';
      
      console.log('设置键值:', { key, value });
      
      // 设置值
      const setResult = await service.set(key, value);
      console.log('设置结果:', setResult);
      expect(setResult).toBe('OK');
      
      // 等待确保写入完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 获取值
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      expect(getResult).toBe(value);
      console.log('✓ useUnloggedTable: true 测试通过');
    });

    it('应该能够缓存对象数据到 unlogged 表', async () => {
      const key = 'unlogged:object:' + Date.now();
      const value = {
        message: 'Unlogged Object Test',
        timestamp: Date.now(),
        config: { useUnloggedTable: true }
      };
      
      console.log('\n=== 测试 unlogged 表对象缓存 ===');
      console.log('键:', key);
      console.log('值:', value);

      // 设置对象
      const setResult = await service.set(key, value);
      expect(setResult).toBe('OK');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 获取对象
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      
      expect(getResult).toEqual(value);
      console.log('✓ unlogged 表对象缓存测试通过');
    });
  });

  describe('默认行为（不设置 useUnloggedTable）', () => {
    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
              table: 'default_cache_test',
              ttl: 60000
              // 不设置 useUnloggedTable，使用默认值
            }
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);
      
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

    it('应该能够使用默认配置进行缓存操作', async () => {
      console.log('\n=== 测试默认 useUnloggedTable 配置 ===');
      
      const key = 'default:test:' + Date.now();
      const value = 'Default Config Test';
      
      console.log('设置键值:', { key, value });
      
      // 设置值
      const setResult = await service.set(key, value);
      console.log('设置结果:', setResult);
      expect(setResult).toBe('OK');
      
      // 等待确保写入完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 获取值
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      expect(getResult).toBe(value);
      console.log('✓ 默认 useUnloggedTable 配置测试通过');
    });
  });

  describe('Redis 兼容方法测试', () => {
    beforeAll(async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
              table: 'redis_compat_test',
              useUnloggedTable: false,
              ttl: 60000
            }
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);
      
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

    it('exists 和 setnx 方法应该正常工作', async () => {
      console.log('\n=== 测试 Redis 兼容方法 ===');
      
      const key = 'redis:compat:test:' + Date.now();
      const value = 'Redis Compat Test';
      
      // 测试 exists - 键不存在
      const existsBefore = await service.exists(key);
      expect(existsBefore).toBe(0);
      console.log('exists before set:', existsBefore);
      
      // 测试 setnx - 首次设置应该成功
      const setnx1 = await service.setnx(key, value);
      expect(setnx1).toBe(1);
      console.log('setnx first time:', setnx1);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 测试 exists - 键存在
      const existsAfter = await service.exists(key);
      expect(existsAfter).toBe(1);
      console.log('exists after set:', existsAfter);
      
      // 测试 setnx - 第二次设置应该失败
      const setnx2 = await service.setnx(key, 'New Value');
      expect(setnx2).toBe(0);
      console.log('setnx second time:', setnx2);
      
      // 验证值没有改变
      const getValue = await service.get(key);
      expect(getValue).toBe(value);
      console.log('final value:', getValue);
      
      console.log('✓ Redis 兼容方法测试通过');
    });
  });
});