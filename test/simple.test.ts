import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Simple Diagnostic Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('开始初始化模块...');
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'simple_test_cache'
          }
        })
      ]
    }).compile();
    console.log('模块编译完成');

    service = module.get<PgCacheService>(PgCacheService);
    console.log('服务获取完成');
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('直接测试底层 Keyv 客户端', async () => {
    console.log('开始测试底层客户端...');
    const client = service.getClient();
    console.log('客户端获取成功:', typeof client);

    // 直接使用 Keyv 客户端
    const setResult = await client.set('direct:test', 'direct value');
    console.log('直接设置结果:', setResult);

    const getResult = await client.get('direct:test');
    console.log('直接获取结果:', getResult);

    expect(getResult).toBe('direct value');
  }, 10000);

  it('测试通过服务层的字符串操作', async () => {
    console.log('开始测试服务层...');
    
    const key = 'service:test:string';
    const value = 'service value';
    
    console.log('设置值:', key, '=', value);
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);

    console.log('获取值:', key);
    const getResult = await service.get(key);
    console.log('获取结果:', getResult);

    expect(setResult).toBe('OK');
    expect(getResult).toBe(value);
  }, 10000);
});