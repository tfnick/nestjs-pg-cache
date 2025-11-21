import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import Keyv from 'keyv';
import PostgresStore from '@keyv/postgres';

describe('Deep Diagnostic Test', () => {
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

  it('深入检查数据持久化问题', async () => {
    console.log('\n=== 深入诊断 ===');
    
    // 1. 检查PgCacheService内部配置
    const cacheClient = (service as any).cache;
    console.log('1. Cache配置检查:');
    console.log('  - 构造函数:', cacheClient.constructor.name);
    console.log('  - URI:', cacheClient.opts?.uri);
    console.log('  - Store:', cacheClient.opts?.store?.constructor.name);
    
    const store = cacheClient.opts?.store;
    
    // 2. 尝试直接通过store查询数据库
    console.log('\n2. 直接数据库检查:');
    try {
      // 清空测试表
      if (typeof store.query === 'function') {
        await store.query('DELETE FROM keyv_cache WHERE key LIKE $1', ['deep:diagnostic:%']);
        console.log('  - 清空测试数据完成');
      }
    } catch (error) {
      console.error('  - 清空数据失败:', error);
    }
    
    // 3. 设置数据并立即检查
    console.log('\n3. 数据设置与立即检查:');
    const key = 'deep:diagnostic:test:' + Date.now();
    const value = 'Deep Diagnostic Value ' + Date.now();
    
    console.log(`  - 设置: ${key} = ${value}`);
    await service.set(key, value);
    
    console.log('  - 从PgCacheService获取...');
    const serviceGet = await service.get(key);
    console.log(`  - 结果: ${serviceGet}`);
    
    // 4. 立即查询数据库
    console.log('\n4. 立即数据库查询:');
    try {
      if (typeof store.query === 'function') {
        const directQuery = await store.query('SELECT * FROM keyv_cache');
        console.log(`  - 数据库总记录数: ${directQuery.length}`);
        
        // 查找我们刚插入的记录
        const ourRecord = directQuery.rows.filter((row: any) => row.key.includes(key));
        console.log(`  - 我们的记录数: ${ourRecord.length}`);
        
        if (ourRecord.length > 0) {
          console.log('  - 找到的记录:', ourRecord[0]);
        }
        
        // 显示所有记录
        console.log('  - 所有记录:');
        directQuery.rows.forEach((row: any, index: number) => {
          console.log(`    ${index + 1}. Key: ${row.key.substring(0, 50)}..., Value: ${row.value.substring(0, 50)}...`);
        });
      } else {
        console.log('  - Store没有query方法');
      }
    } catch (error) {
      console.error('  - 数据库查询失败:', error);
    }
    
    // 5. 尝试不同的表名测试
    console.log('\n5. 测试不同表名:');
    try {
      const testStore = new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'test_different_table',
        useUnloggedTable: false
      });
      
      const testKeyv = new Keyv({ store: testStore });
      await testKeyv.set('different_table_test', 'works');
      const testResult = await testKeyv.get('different_table_test');
      console.log(`  - 不同表测试结果: ${testResult}`);
      
      // 查询这个表
      if (typeof testStore.query === 'function') {
        const testTableData: any = await testStore.query('SELECT * FROM test_different_table');
        console.log(`  - 测试表记录数: ${testTableData.rows.length}`);
        if (testTableData.rows.length > 0) {
          console.log('  - 测试表数据:', testTableData.rows[0]);
        }
      }
      
    } catch (error) {
      console.error('  - 不同表测试失败:', error);
    }
    
    console.log('\n✓ 深入诊断完成');
  });
});