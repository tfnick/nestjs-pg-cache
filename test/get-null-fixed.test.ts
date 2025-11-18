import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Get Null Issue Fixed', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'issue_fixed_cache',
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

  it('get 不应该返回 null', async () => {
    console.log('\n=== 测试 get 返回 null 问题是否已修复 ===');
    
    const key = 'issue-fixed:' + Date.now();
    const value = 'Issue Fixed Test';
    
    console.log('设置:', { key, value });
    
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
    
    // 验证结果
    expect(getResult).not.toBeNull();
    expect(getResult).toBe(value);
    
    console.log('✓ get 返回 null 问题已修复');
  });

  it('对象缓存也应该正常工作', async () => {
    console.log('\n=== 测试对象缓存 ===');
    
    const key = 'object-fixed:' + Date.now();
    const value = { message: 'Object Test', status: 'success', timestamp: Date.now() };
    
    console.log('设置对象:', { key, value });
    
    // 设置对象
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    expect(setResult).toBe('OK');
    
    // 等待确保写入完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 获取对象
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    // 验证结果
    expect(getResult).not.toBeNull();
    expect(getResult).toEqual(value);
    
    console.log('✓ 对象缓存也正常工作');
  });
});