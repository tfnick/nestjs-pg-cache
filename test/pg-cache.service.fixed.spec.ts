import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import PostgresStore from "@keyv/postgres";

describe('PgCacheService Fixed Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('=== 开始初始化测试模块 ===');
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'keyv_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000 // 1分钟
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
    // 每个测试前清空缓存，但允许一些时间间隔
    try {
      await service.reset();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn('清理缓存失败:', error);
    }
  });

  describe('基础缓存操作', () => {
    it('应该能够设置和获取字符串值', async () => {
      const key = 'fixed:string:' + Date.now();
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
      const key = 'fixed:object:' + Date.now();
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

    it('应该能够处理不存在的键', async () => {
      const result = await service.get('fixed:nonexistent');
      expect(result).toBeNull();
      console.log('✓ 不存在键测试通过');
    });

    it('应该能够删除键', async () => {
      const key = 'fixed:delete:' + Date.now();
      const value = 'to be deleted';
      
      console.log('\n=== 测试删除操作 ===');
      
      // 设置值
      await service.set(key, value);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const beforeDelete = await service.get(key);
      expect(beforeDelete).toBe(value);
      console.log('删除前验证通过');

      // 删除键
      const deleteResult = await service.del(key);
      expect(deleteResult).toBe(1);
      console.log('删除操作通过:', deleteResult);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 确认键已删除
      const afterDelete = await service.get(key);
      expect(afterDelete).toBeNull();
      console.log('✓ 删除测试通过');
    });

    it('应该能够批量获取值', async () => {
      const timestamp = Date.now();
      const keys = [
        `fixed:mget:1:${timestamp}`,
        `fixed:mget:2:${timestamp}`,
        `fixed:mget:3:${timestamp}`
      ];
      const values = ['value1', 'value2', 'value3'];
      
      console.log('\n=== 测试批量获取 ===');

      // 设置多个值
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 批量获取
      const results = await service.mget(keys);
      console.log('批量获取结果:', results);
      expect(results).toEqual(values);
      
      // 清理
      await service.del(keys);
      console.log('✓ 批量获取测试通过');
    });
  });

  describe('Redis 兼容方法', () => {
    it('exists 应该检查键是否存在', async () => {
      const key = 'fixed:exists:' + Date.now();
      
      console.log('\n=== 测试 exists 方法 ===');
      
      // 键不存在时应该返回 0
      const exists1 = await service.exists(key);
      expect(exists1).toBe(0);
      console.log('不存在键检查通过:', exists1);

      // 设置键
      await service.set(key, 'value');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 键存在时应该返回 1
      const exists2 = await service.exists(key);
      expect(exists2).toBe(1);
      console.log('存在键检查通过:', exists2);
      
      console.log('✓ exists 测试通过');
    });

    it('setnx 应该只在键不存在时设置', async () => {
      const key = 'fixed:setnx:' + Date.now();
      const value1 = 'first';
      const value2 = 'second';
      
      console.log('\n=== 测试 setnx 方法 ===');

      // 第一次设置应该成功
      const result1 = await service.setnx(key, value1);
      expect(result1).toBe(1);
      console.log('第一次 setnx 结果:', result1);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(await service.get(key)).toBe(value1);

      // 第二次设置应该失败
      const result2 = await service.setnx(key, value2);
      expect(result2).toBe(0);
      console.log('第二次 setnx 结果:', result2);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(await service.get(key)).toBe(value1); // 值不变
      
      console.log('✓ setnx 测试通过');
    });

    it('strlen 应该返回字符串值的长度', async () => {
      const key = 'fixed:strlen:' + Date.now();
      const stringValue = 'Hello, NestJS!';
      const objectValue = { message: 'test' };
      
      console.log('\n=== 测试 strlen 方法 ===');

      // 测试字符串值
      await service.set(key + ':string', stringValue);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const length1 = await service.strlen(key + ':string');
      expect(length1).toBe(stringValue.length);
      console.log('字符串长度测试通过:', length1);

      // 测试对象值（JSON序列化后的长度）
      await service.set(key + ':object', objectValue);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const length2 = await service.strlen(key + ':object');
      expect(length2).toBe(JSON.stringify(objectValue).length);
      console.log('对象长度测试通过:', length2);
      
      console.log('✓ strlen 测试通过');
    });
  });

  describe('哈希操作', () => {
    it('哈希操作应该正常工作', async () => {
      const hashKey = 'fixed:hash:' + Date.now();
      const field = 'test_field';
      const value = 'hash value';
      
      console.log('\n=== 测试哈希操作 ===');

      // 设置哈希字段
      const hsetResult = await service.hset(hashKey, field, value);
      expect(hsetResult).toBe('OK');
      console.log('hset 结果:', hsetResult);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 获取哈希字段
      const hgetResult = await service.hget(hashKey, field);
      expect(hgetResult).toBe(value);
      console.log('hget 结果:', hgetResult);

      // 检查字段是否存在
      const hexistsResult = await service.hexists(hashKey, field);
      expect(hexistsResult).toBe(1);
      console.log('hexists 结果:', hexistsResult);

      // 删除哈希字段
      const hdelResult = await service.hdel(hashKey, field);
      expect(hdelResult).toBe(1);
      console.log('hdel 结果:', hdelResult);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 确认字段已删除
      const hgetAfterDelete = await service.hget(hashKey, field);
      expect(hgetAfterDelete).toBeNull();
      console.log('删除后 hget 结果:', hgetAfterDelete);
      
      console.log('✓ 哈希操作测试通过');
    });
  });

  describe('错误处理', () => {
    it('应该处理空键值', async () => {
      const setResult = await service.set('', 'value');
      expect(setResult).toBeNull();

      const getResult = await service.get('');
      expect(getResult).toBeNull();
      
      console.log('✓ 空键值处理通过');
    });

    it('应该处理空键数组', async () => {
      const result1 = await service.mget([]);
      expect(result1).toEqual([]);

      const result2 = await service.del([]);
      expect(result2).toBe(0);
      
      console.log('✓ 空数组处理通过');
    });
  });

  describe('向后兼容方法', () => {
    it('getValue 和 setValue 应该正常工作', async () => {
      const key = 'fixed:compat:' + Date.now();
      const value = { test: 'compatibility' };
      
      console.log('\n=== 测试向后兼容方法 ===');

      // 使用 setValue
      const setResult = await service.setValue(key, value);
      expect(setResult).toBe(true);
      console.log('setValue 结果:', setResult);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 使用 getValue
      const getResult = await service.getValue(key);
      expect(getResult).toEqual(value);
      console.log('getValue 结果:', getResult);
      
      console.log('✓ 向后兼容测试通过');
    });

    it('clearCache 应该清空所有缓存', async () => {
      console.log('\n=== 测试 clearCache 方法 ===');
      
      // 设置一些测试数据
      await service.setValue('fixed:clear1', 'value1');
      await service.setValue('fixed:clear2', 'value2');
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 确认数据存在
      expect(await service.getValue('fixed:clear1')).toBe('value1');
      expect(await service.getValue('fixed:clear2')).toBe('value2');
      console.log('清空前数据验证通过');

      // 清空缓存
      await service.clearCache();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 确认数据已清空
      expect(await service.getValue('fixed:clear1')).toBeUndefined();
      expect(await service.getValue('fixed:clear2')).toBeUndefined();
      
      console.log('✓ clearCache 测试通过');
    });
  });
});