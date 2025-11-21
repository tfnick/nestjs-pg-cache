import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Working Solution Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('\n=== 工作解决方案测试 ===');
    
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'working_solution_cache', // 使用新表避免冲突
            namespace: '', // 明确设置空namespace
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get<PgCacheService>(PgCacheService);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 增加等待时间
    
    // 验证初始化
    const cacheClient = (service as any).cache;
    console.log('初始化验证:');
    console.log('  - Cache类型:', cacheClient.constructor.name);
    console.log('  - 有Store:', !!cacheClient.opts?.store);
    console.log('  - Store类型:', cacheClient.opts?.store?.constructor.name);
    
    const store = cacheClient.opts?.store;
    if (store && typeof store.query === 'function') {
      try {
        await store.query('SELECT 1 as test');
        console.log('  - 数据库连接: ✅ 验证通过');
      } catch (error) {
        console.log('  - 数据库连接: ❌ 验证失败');
      }
    } else {
      console.log('  - 数据库连接: ❌ 无法验证');
    }
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  it('工作解决方案验证', async () => {
    console.log('\n=== 工作解决方案验证 ===');
    
    const key = 'working:solution:' + Date.now();
    const value = 'Working Solution Test Value';
    
    console.log(`1. 设置数据: ${key} = ${value}`);
    
    // 设置数据
    const setResult = await service.set(key, value);
    console.log(`   设置结果: ${setResult}`);
    expect(setResult).toBe('OK');
    
    // 等待更长时间确保持久化
    console.log('2. 等待数据持久化...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 获取数据
    console.log('3. 获取数据...');
    const getResult = await service.get(key);
    console.log(`   获取结果: ${getResult}`);
    expect(getResult).toBe(value);
    
    // 验证数据库
    console.log('4. 验证数据库持久化...');
    const cacheClient = (service as any).cache;
    const store = cacheClient.opts?.store;
    
    if (store && typeof store.query === 'function') {
      try {
        const data = await store.query('SELECT key, value FROM working_solution_cache ORDER BY created_at DESC LIMIT 10');
        console.log(`   数据库记录数: ${data.rows ? data.rows.length : 0}`);
        
        if (data.rows && data.rows.length > 0) {
          console.log('   最新记录:');
          data.rows.slice(0, 3).forEach((row: any, index: number) => {
            console.log(`     ${index + 1}. Key="${row.key}", Value="${row.value}"`);
          });
          
          // 查找我们的记录
          const ourRecord = data.rows.find((row: any) => row.key.includes(key));
          if (ourRecord) {
            console.log(`   ✅ 找到我们的记录: Key="${ourRecord.key}", Value="${ourRecord.value}"`);
            expect(ourRecord.value).toContain(value);
          } else {
            console.log('   ❌ 未找到我们的记录');
            throw new Error('数据未持久化到数据库');
          }
        } else {
          console.log('   ❌ 数据库中没有记录');
          throw new Error('数据未持久化到数据库');
        }
        
      } catch (error) {
        console.error('   数据库验证失败:', error);
        throw error;
      }
    } else {
      throw new Error('无法访问数据库存储');
    }
    
    console.log('✅ 工作解决方案验证通过');
  });
});