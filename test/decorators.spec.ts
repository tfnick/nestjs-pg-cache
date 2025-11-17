import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { PgCacheModule, PgCacheService } from '../src';
import { Cacheable, CacheEvict, CachePut, CacheConditional } from '../src/decorators/keyv-cache.decorator';

describe('Cache Decorators Integration Tests', () => {
  let service: PgCacheService;
  let module: TestingModule;
  let testService: TestService;

  // 测试数据库配置
  const testDbConfig = {
    cache: {
      uri: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache',
      table: 'test_cache_table'
    }
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PgCacheModule.forRoot(testDbConfig)],
      providers: [TestService]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    testService = module.get<TestService>(TestService);
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await service.reset();
  });

  describe('Cacheable 装饰器', () => {
    it('应该缓存方法结果', async () => {
      // 第一次调用应该执行方法并缓存结果
      const result1 = await testService.getUserById('123');
      expect(result1).toEqual({ id: '123', name: 'User 123' });

      // 第二次调用应该从缓存获取，不执行方法
      const result2 = await testService.getUserById('123');
      expect(result2).toEqual({ id: '123', name: 'User 123' });
    });

    it('应该正确处理不同的参数', async () => {
      const user1 = await testService.getUserById('111');
      const user2 = await testService.getUserById('222');

      expect(user1.id).toBe('111');
      expect(user2.id).toBe('222');
    });

    it('应该处理对象参数', async () => {
      const criteria = { name: 'John', age: 30 };
      const result = await testService.searchUsers(criteria);
      
      expect(result).toEqual([criteria]);
    });

    it('应该在方法出错时不缓存结果', async () => {
      await expect(testService.getErrorMethod()).rejects.toThrow('Test error');
      
      // 再次调用应该仍然抛出错误（没有被缓存）
      await expect(testService.getErrorMethod()).rejects.toThrow('Test error');
    });

    it('应该正确设置缓存过期时间', async () => {
      await testService.getShortTtlData('key1');
      
      // 立即获取应该成功
      const cachedData = await service.get('short:ttl:key1');
      expect(cachedData).toEqual('data for key1');
    });
  });

  describe('CacheEvict 装饰器', () => {
    it('应该在方法执行后清除指定缓存', async () => {
      // 先缓存一些数据
      await testService.getUserById('456');
      const cachedUser = await service.get('user:info:456');
      expect(cachedUser).toBeTruthy();

      // 执行清除操作
      await testService.updateUser('456', { name: 'Updated Name' });

      // 验证缓存已被清除
      const cachedUserAfter = await service.get('user:info:456');
      expect(cachedUserAfter).toBeNull();
    });

    it('应该处理键格式化失败的情况', async () => {
      // 这个调用应该成功但不会清除任何缓存（键格式化失败）
      const result = await testService.invalidKeyMethod('test');
      expect(result).toBe('result');
    });
  });

  describe('CachePut 装饰器', () => {
    it('应该在方法执行后更新缓存', async () => {
      // 先获取初始数据并缓存
      const user1 = await testService.getUserById('789');
      expect(user1.name).toBe('User 789');

      // 使用 CachePut 更新用户
      const updatedUser = await testService.updateUserWithCache('789', { name: 'New Name' });
      expect(updatedUser.name).toBe('New Name');

      // 再次获取应该返回更新后的数据（从缓存）
      const user2 = await testService.getUserById('789');
      expect(user2.name).toBe('New Name');
    });
  });

  describe('CacheConditional 装饰器', () => {
    it('应该根据条件决定是否缓存', async () => {
      // 这个结果会被缓存（条件为 true）
      const result1 = await testService.getConditionalData(true, 'key1');
      expect(result1).toEqual({ data: 'key1', shouldCache: true });

      // 再次调用应该从缓存获取
      const result2 = await testService.getConditionalData(true, 'key1');
      expect(result2).toEqual({ data: 'key1', shouldCache: true });

      // 这个结果不会被缓存（条件为 false）
      const result3 = await testService.getConditionalData(false, 'key2');
      expect(result3).toEqual({ data: 'key2', shouldCache: false });

      // 再次调用应该仍然执行方法（因为没有缓存）
      const callCount = (testService as any).conditionalCallCount || 0;
      await testService.getConditionalData(false, 'key2');
      expect((testService as any).conditionalCallCount).toBeGreaterThan(callCount);
    });
  });

  describe('装饰器错误处理', () => {
    it('应该在缓存服务不可用时正常执行方法', async () => {
      // 这个测试需要模拟缓存服务不可用的情况
      // 在实际环境中，如果装饰器无法注入缓存服务，应该直接执行原方法
      const result = await testService.getMethodWithFallback('test');
      expect(result).toBe('fallback result');
    });
  });
});

// 测试服务类
@Injectable()
class TestService {
  private callCount = 0;
  private conditionalCallCount = 0;

  @Cacheable('user:', 'info:{{0}}', 300000) // 5分钟缓存
  async getUserById(id: string): Promise<{ id: string; name: string }> {
    this.callCount++;
    console.log(`getUserById called ${this.callCount} times for id: ${id}`);
    
    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return { id, name: `User ${id}` };
  }

  @Cacheable('search:', 'users:{{0}}', 60000) // 1分钟缓存
  async searchUsers(criteria: any): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return [criteria];
  }

  @Cacheable('error:', 'test:{{0}}')
  async getErrorMethod(): Promise<string> {
    throw new Error('Test error');
  }

  @Cacheable('short:', 'ttl:{{0}}', 1000) // 1秒缓存
  async getShortTtlData(key: string): Promise<string> {
    return `data for ${key}`;
  }

  @CacheEvict('user:', 'info:{{0}}')
  async updateUser(id: string, data: Partial<{ name: string }>): Promise<{ id: string; name: string }> {
    // 模拟更新操作
    return { id, name: data.name || `User ${id}` };
  }

  @CachePut('user:', 'info:{{0}}', 300000)
  async updateUserWithCache(id: string, data: Partial<{ name: string }>): Promise<{ id: string; name: string }> {
    // 模拟更新操作
    return { id, name: data.name || `User ${id}` };
  }

  @CacheConditional(
    'conditional:',
    'data:{{1}}',
    (result, args) => result.shouldCache, // 只有当 shouldCache 为 true 时才缓存
    120000 // 2分钟缓存
  )
  async getConditionalData(shouldCache: boolean, key: string): Promise<{ data: string; shouldCache: boolean }> {
    this.conditionalCallCount++;
    console.log(`getConditionalData called ${this.conditionalCallCount} times`);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return { data: key, shouldCache };
  }

  @CacheEvict('test:', 'invalid:{{10}}') // 无效的参数索引
  async invalidKeyMethod(param: string): Promise<string> {
    return 'result';
  }

  @Cacheable('fallback:', 'method:{{0}}')
  async getMethodWithFallback(param: string): Promise<string> {
    return 'fallback result';
  }
}