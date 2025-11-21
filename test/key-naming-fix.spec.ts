import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Key Naming Fix Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'keyv_cache',
            namespace: '', // 明确设置空namespace
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  it('验证key命名一致性', async () => {
    console.log('\n=== Key命名一致性测试 ===');
    
    const key = 'naming:test:' + Date.now();
    const value = 'Key Naming Test Value';
    
    console.log(`1. 测试数据: ${key} = ${value}`);
    
    // 步骤1：设置数据
    console.log('2. 设置数据...');
    const setResult = await service.set(key, value);
    console.log('   设置结果:', setResult);
    
    // 等待数据持久化
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 步骤2：获取数据
    console.log('3. 获取数据...');
    const getResult = await service.get(key);
    console.log('   获取结果:', getResult);
    
    // 步骤3：直接查询数据库验证
    console.log('4. 直接验证数据库...');
    const cacheClient = (service as any).cache;
    const store = cacheClient.opts?.store;
    
    if (store && typeof store.query === 'function') {
      try {
        // 查询所有数据
        const allData = await store.query('SELECT key, value FROM keyv_cache ORDER BY created_at DESC LIMIT 10');
        console.log(`   数据库记录数: ${allData.rows ? allData.rows.length : 0}`);
        
        if (allData.rows && allData.rows.length > 0) {
          console.log('   所有记录:');
          allData.rows.forEach((row: any, index: number) => {
            console.log(`     ${index + 1}. Key="${row.key}", Value="${row.value}"`);
          });
          
          // 查找与我们的key相关的记录
          console.log('5. 查找相关记录...');
          const patterns = [
            `%${key}%`,                    // 包含我们的key
            `keyv:${key}%`,                // 带keyv前缀
            `keyv::${key}`,                // 带空namespace
            `${key}%`,                     // 直接匹配
          ];
          
          for (const pattern of patterns) {
            const result = await store.query('SELECT key, value FROM keyv_cache WHERE key LIKE $1', [pattern]);
            if (result.rows && result.rows.length > 0) {
              console.log(`   模式 "${pattern}" 找到 ${result.rows.length} 条记录:`);
              result.rows.forEach((row: any) => {
                console.log(`     Key="${row.key}", Value="${row.value}"`);
              });
            }
          }
        }
        
      } catch (error) {
        console.error('   数据库查询失败:', error);
      }
    } else {
      console.log('   无法访问数据库存储');
    }
    
    // 验证期望结果
    console.log('6. 验证结果:');
    console.log(`   set结果: ${setResult}`);
    console.log(`   get结果: ${getResult}`);
    console.log(`   期望值: ${value}`);
    
    expect(setResult).toBe('OK');
    expect(getResult).toBe(value);
    
    console.log('✓ Key命名一致性测试通过');
  });
});