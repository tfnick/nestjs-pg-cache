import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('PgCacheService Simple Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('=== 初始化测试模块 ===');
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'simple_test_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    console.log('=== 服务初始化完成 ===');
    
    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 2000));
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

  it('服务应该正确定义', () => {
    expect(service).toBeDefined();
    expect(service.getClient()).toBeDefined();
  });

  it('应该能够设置和获取字符串值', async () => {
    const key = 'simple:string:' + Date.now();
    const value = 'Hello, World!';
    
    console.log('\n=== 测试字符串缓存 ===');
    console.log('键:', key);
    console.log('值:', value);

    // 设置值
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    expect(setResult).toBe('OK');

    // 等待确保写入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 获取值
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    expect(getResult).toBe(value);
    console.log('✓ 字符串测试通过');
  });

  it('应该能够设置和获取对象值', async () => {
    const key = 'simple:object:' + Date.now();
    const value = { id: 1, name: 'Test User', active: true };
    
    console.log('\n=== 测试对象缓存 ===');
    console.log('键:', key);
    console.log('值:', value);

    // 设置值
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    expect(setResult).toBe('OK');

    // 等待确保写入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 获取值
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    expect(getResult).toEqual(value);
    console.log('✓ 对象测试通过');
  });

  it('应该能够处理不存在的键', async () => {
    const result = await service.get('simple:nonexistent');
    expect(result).toBeNull();
    console.log('✓ 不存在键测试通过');
  });

  it('应该能够删除键', async () => {
    const key = 'simple:delete:' + Date.now();
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
});