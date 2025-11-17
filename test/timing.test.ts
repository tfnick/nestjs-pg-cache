import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Timing Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'timing_test_cache'
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('等待一段时间后再获取', async () => {
    const key = 'timing:test:' + Date.now();
    const value = 'timing value';
    
    console.log('设置值:', key);
    const setResult = await service.set(key, value);
    expect(setResult).toBe('OK');
    
    console.log('等待 2 秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('获取值:', key);
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);
    
    expect(getResult).toBe(value);
    
    // 清理
    await service.del(key);
  }, 10000);

  it('立即获取但检查底层状态', async () => {
    const key = 'immediate:test:' + Date.now();
    const value = 'immediate value';
    
    console.log('设置值:', key);
    const setResult = await service.set(key, value);
    console.log('set 结果:', setResult);
    
    console.log('立即检查底层存储...');
    const client = service.getClient();
    const rawResult = await client.get(key);
    console.log('底层存储结果:', rawResult);
    
    console.log('通过服务层获取...');
    const getResult = await service.get(key);
    console.log('服务层结果:', getResult);
    
    expect(setResult).toBe('OK');
    expect(rawResult).toBe(value);
    expect(getResult).toBe(value);
    
    // 清理
    await service.del(key);
  }, 10000);
});