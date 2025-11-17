// 独立测试，不依赖 NestJS 模块系统
import { PgCacheServiceSimple } from '../src/services/pg-cache.service.simple';
import { PgCacheOptions } from '../src/interfaces/pg-cache-options.interface';

describe('Standalone PgCacheService Test', () => {
  let service: PgCacheServiceSimple;

  beforeAll(async () => {
    // 直接创建服务实例
    const options: PgCacheOptions = {
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'standalone_test_cache'
    };
    
    // 使用反射创建实例，绕过依赖注入
    service = new (PgCacheServiceSimple as any)(options);
    
    console.log('服务创建完成');
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
  });

  it('独立环境下的基础 set/get 测试', async () => {
    const key = 'standalone:test:' + Date.now();
    const value = 'standalone value';
    
    console.log('设置值:', key, '=', value);
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    
    console.log('获取值:', key);
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    
    expect(setResult).toBe('OK');
    expect(getResult).toBe(value);
  });

  it('独立环境下的对象测试', async () => {
    const key = 'standalone:object:' + Date.now();
    const value = { id: 1, name: 'Test Object' };
    
    console.log('设置对象:', key, '=', value);
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    
    console.log('获取对象:', key);
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    
    expect(setResult).toBe('OK');
    expect(getResult).toEqual(value);
  });
});