import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Simple Persistence Test', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: 'postgresql://postgres:123456@localhost:5432/postgres',
            table: 'test_simple_persistence',
            useUnloggedTable: false,
          },
        }),
      ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);
  });

  afterAll(async () => {
    await cacheService.reset();
    await module.close();
  });

  it('should verify immediate persistence', async () => {
    console.log('=== Testing Immediate Persistence ===');
    
    // 设置数据
    const result = await cacheService.set('my_test_key', 'my_test_value');
    console.log('Set operation result:', result);
    
    // 立即获取验证
    const value = await cacheService.get('my_test_key');
    console.log('Get operation result:', value);
    
    expect(result).toBe('OK');
    expect(value).toBe('my_test_value');
    
    console.log('=== Persistence test completed ===');
  });
});