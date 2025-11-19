import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Business Keys Test', () => {
  let cacheService: PgCacheService;
  let module: TestingModule;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'test_business_keys';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: TEST_URI,
            table: TEST_TABLE,
            useUnloggedTable: true,
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

  beforeEach(async () => {
    await cacheService.reset();
  });

  it('should support business layer wildcard query pattern', async () => {
    // 模拟业务层数据
    await cacheService.set('sys_dict:user', 'dict1');
    await cacheService.set('sys_dict:role', 'dict2');
    await cacheService.set('sys_dict:permission', 'dict3');
    await cacheService.set('other_data:test', 'other');

    // 模拟业务层调用：const data = await this.cacheService.keys(id + '*');
    const id = 'sys_dict';
    const data = await cacheService.keys(id + '*');
    
    console.log(`Keys for pattern "${id}*":`, data);
    
    // 验证结果
    expect(data).toContain('sys_dict:user');
    expect(data).toContain('sys_dict:role');
    expect(data).toContain('sys_dict:permission');
    expect(data).toHaveLength(3);
    
    // 验证不包含其他数据
    expect(data).not.toContain('other_data:test');
  });

  it('should handle exact match as well', async () => {
    await cacheService.set('sys_dict:user', 'dict1');

    const exactData = await cacheService.keys('sys_dict:user');
    console.log(`Exact match for "sys_dict:user":`, exactData);
    
    expect(exactData).toEqual(['sys_dict:user']);
  });
});