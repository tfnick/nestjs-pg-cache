import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Unlogged Table Option', () => {
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_unlogged_option';

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should handle useUnloggedTable: false correctly', async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          global: true,
          useFactory: () => {
            return {
              cache: {
                uri: TEST_URI,
                namespace: '',
                table: TEST_TABLE,
                useUnloggedTable: false, // 测试这个选项
                ttl: 3600000,
              },
            };
          },
        }),
      ],
    }).compile();

    const cacheService = module.get<PgCacheService>(PgCacheService);
    
    // 测试基本功能
    await cacheService.set('test:key', 'test_value');
    const value = await cacheService.get('test:key');
    expect(value).toBe('test_value');

    // 检查缓存选项
    const options = (cacheService as any).options;
    console.log('Cache options:', options);
    expect(options.useUnloggedTable).toBe(false);
  });

  it('should handle useUnloggedTable: true correctly', async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          global: true,
          useFactory: () => {
            return {
              cache: {
                uri: TEST_URI,
                namespace: '',
                table: TEST_TABLE + '_unlogged',
                useUnloggedTable: true, // 测试这个选项
                ttl: 3600000,
              },
            };
          },
        }),
      ],
    }).compile();

    const cacheService = module.get<PgCacheService>(PgCacheService);
    
    // 测试基本功能
    await cacheService.set('test:key', 'test_value');
    const value = await cacheService.get('test:key');
    expect(value).toBe('test_value');

    // 检查缓存选项
    const options = (cacheService as any).options;
    console.log('Cache options with unlogged:', options);
    expect(options.useUnloggedTable).toBe(true);
  });
});