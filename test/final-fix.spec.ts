import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import Keyv from 'keyv';
import PostgresStore from '@keyv/postgres';

describe('Final Fix Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('\n=== 最终修复测试 ===');
    
    // 清理主测试表
    try {
      const cleanupStore = new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'keyv_cache',
        useUnloggedTable: false
      });
      
      if (typeof cleanupStore.query === 'function') {
        await cleanupStore.query('DELETE FROM keyv_cache');
        console.log('清理主测试表完成');
      }
    } catch (error) {
      console.warn('清理表失败:', (error as Error).message);
    }

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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 详细检查初始化结果
    const cacheClient = (service as any).cache;
    console.log('初始化完成检查:');
    console.log('  - Cache类型:', cacheClient.constructor.name);
    console.log('  - 有Store:', !!cacheClient.opts?.store);
    console.log('  - Store类型:', cacheClient.opts?.store?.constructor.name);
    
    // 强制验证数据库连接
    const store = cacheClient.opts?.store;
    if (store && typeof store.query === 'function') {
      try {
        const testQuery = await store.query('SELECT 1 as test');
        console.log('  - 数据库连接: OK');
      } catch (error) {
        console.error('  - 数据库连接失败:', (error as Error).message);
      }
    } else {
      console.warn('  - Store没有query方法，可能不是PostgreSQL存储');
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

  it('验证修复后的数据持久化', async () => {
    console.log('\n=== 数据持久化验证 ===');
    
    const key = 'final:test:' + Date.now();
    const value = 'Final Fix Test Value ' + Date.now();
    
    console.log(`1. 设置数据: ${key} = ${value}`);
    const setResult = await service.set(key, value);
    expect(setResult).toBe('OK');
    
    // 等待数据持久化
    console.log('2. 等待数据持久化...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. 从服务获取数据...');
    const getServiceResult = await service.get(key);
    console.log(`   结果: ${getServiceResult}`);
    expect(getServiceResult).toBe(value);
    
    console.log('4. 直接查询数据库...');
    const store = (service as any).cache.opts?.store;
    if (store && typeof store.query === 'function') {
      try {
        // 查询所有数据
        const allData = await store.query('SELECT key, value FROM keyv_cache');
        console.log(`   总记录数: ${allData.rows.length}`);
        
        // 查找我们的记录
        const ourRecords = allData.rows.filter((row: any) => row.key.includes(key));
        console.log(`   我们的记录数: ${ourRecords.length}`);
        
        if (ourRecords.length > 0) {
          console.log('   ✓ 找到记录:', ourRecords[0]);
          expect(ourRecords[0].value).toContain(value);
        } else {
          console.log('   ✗ 没有找到记录，显示所有记录:');
          allData.rows.forEach((row: any, index: number) => {
            console.log(`     ${index + 1}. ${row.key.substring(0, 50)}... = ${row.value.substring(0, 50)}...`);
          });
          // 这种情况下我们重新创建一个正确的PgCacheService
          throw new Error('数据未持久化到数据库');
        }
      } catch (error) {
        console.error('   数据库查询失败:', error);
        throw error;
      }
    } else {
      throw new Error('无法访问数据库存储');
    }
    
    console.log('✓ 最终修复测试通过');
  });
});