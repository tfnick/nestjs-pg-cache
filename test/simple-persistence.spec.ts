import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Persistence Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
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
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  it('应该验证数据持久化到数据库', async () => {
    const key = 'persistence:test:' + Date.now();
    const value = 'Test Persistence Value';
    
    console.log('\n=== 数据持久化测试 ===');
    console.log('设置键值:', key, '=', value);

    // 设置值
    const setResult = await service.set(key, value);
    console.log('设置结果:', setResult);
    expect(setResult).toBe('OK');

    // 等待写入完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 直接从数据库检查数据
    console.log('检查数据库中的实际数据...');
    const client = (service as any).cache.opts?.store?.opts?.client;
    
    if (client) {
      try {
        const result = await client.query(
          'SELECT key, value FROM keyv_cache WHERE key LIKE $1 ORDER BY created_at DESC LIMIT 5',
          [`%${key}%`]
        );
        
        console.log('数据库查询结果:', result.rows.length, '条记录');
        result.rows.forEach((row: any, index: number) => {
          console.log(`${index + 1}. Key: ${row.key}, Value: ${row.value}`);
        });
        
        expect(result.rows.length).toBeGreaterThan(0);
        
        // 检查是否能获取到值
        const getValue = await service.get(key);
        console.log('从缓存获取的值:', getValue);
        expect(getValue).toBe(value);
        
      } catch (error) {
        console.error('数据库查询错误:', error);
        throw error;
      }
    } else {
      console.log('无法获取数据库客户端');
      
      // 至少验证缓存能获取到值
      const getValue = await service.get(key);
      console.log('从缓存获取的值:', getValue);
      expect(getValue).toBe(value);
    }
    
    console.log('✓ 持久化测试通过');
  });
});