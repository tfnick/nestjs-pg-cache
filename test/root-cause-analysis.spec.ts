import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';
import Keyv from 'keyv';
import PostgresStore from '@keyv/postgres';

describe('Root Cause Analysis', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('\n=== 根本原因分析测试 ===');
    
    // 清理主测试表
    const cleanupStore = new PostgresStore({
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'keyv_cache',
      useUnloggedTable: false
    });
    
    if (typeof cleanupStore.query === 'function') {
      try {
        await cleanupStore.query('DELETE FROM keyv_cache');
        console.log('1. 清理主测试表完成');
      } catch (error) {
        console.warn('清理表失败:', (error as Error).message);
      }
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
    
    // 详细检查PgCacheService配置
    const cacheClient = (service as any).cache;
    console.log('2. PgCacheService配置分析:');
    console.log('   - Cache类型:', cacheClient.constructor.name);
    console.log('   - 有Store:', !!cacheClient.opts?.store);
    console.log('   - Store类型:', cacheClient.opts?.store?.constructor.name);
    console.log('   - URI:', cacheClient.opts?.uri);
    console.log('   - Table:', cacheClient.opts?.table);
    console.log('   - Namespace:', cacheClient.opts?.namespace);
    
    const store = cacheClient.opts?.store;
    if (store) {
      console.log('3. Store配置分析:');
      console.log('   - Store URI:', store.opts?.uri);
      console.log('   - Store Table:', store.opts?.table);
      console.log('   - Store has query:', typeof store.query === 'function');
      console.log('   - Store has connect:', typeof store.connect === 'function');
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

  it('根本原因分析：key命名不一致问题', async () => {
    console.log('\n=== 关键问题诊断 ===');
    
    const key = 'root:cause:test:' + Date.now();
    const value = 'Root Cause Test Value';
    
    console.log(`4. 测试数据: ${key} = ${value}`);
    
    // 步骤1：PgCacheService设置
    console.log('5. PgCacheService.set()...');
    const setResult = await service.set(key, value);
    console.log('   设置结果:', setResult);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤2：PgCacheService获取
    console.log('6. PgCacheService.get()...');
    const getResult = await service.get(key);
    console.log('   获取结果:', getResult);
    
    // 步骤3：直接检查数据库
    console.log('7. 直接检查数据库...');
    const cacheClient = (service as any).cache;
    const store = cacheClient.opts?.store;
    
    if (store && typeof store.query === 'function') {
      try {
        // 查询所有数据
        const allData = await store.query('SELECT key, value FROM keyv_cache');
        console.log(`   数据库总记录数: ${allData.rows.length}`);
        
        if (allData.rows.length > 0) {
          console.log('   数据库中的所有记录:');
          allData.rows.forEach((row: any, index: number) => {
            console.log(`     ${index + 1}. Key: "${row.key}", Value: "${row.value}"`);
          });
        }
        
        // 尝试查找我们的记录 - 使用不同的模式
        console.log('8. 查找我们的记录（不同模式）:');
        
        const patterns = [
          key,                                    // 原始key
          `keyv:${key}`,                          // 带keyv前缀
          `keyv:${cacheClient.opts?.namespace}:${key}`, // 带namespace
          `%${key}`,                              // 模糊匹配
        ];
        
        for (const pattern of patterns) {
          const result = await store.query('SELECT * FROM keyv_cache WHERE key LIKE $1', [pattern]);
          console.log(`   模式 "${pattern}": ${result.rows.length} 条记录`);
          if (result.rows.length > 0) {
            result.rows.forEach((row: any) => {
              console.log(`     找到: Key="${row.key}", Value="${row.value}"`);
            });
          }
        }
        
      } catch (error) {
        console.error('   数据库查询失败:', error);
      }
    } else {
      console.log('   无法访问数据库存储');
    }
    
    // 步骤4：创建对照组测试
    console.log('9. 对照组测试：直接PostgresStore...');
    try {
      const directStore = new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'keyv_cache',
        useUnloggedTable: false
      });
      
      const directKeyv = new Keyv({ 
        store: directStore,
        namespace: '' // 明确设置空namespace
      });
      
      const directKey = 'direct:control:test:' + Date.now();
      await directKeyv.set(directKey, 'Direct Control Value');
      
      console.log(`   直接设置: ${directKey} = Direct Control Value`);
      
      const directGet = await directKeyv.get(directKey);
      console.log(`   直接获取结果: ${directGet}`);
      
      // 查询直接设置的记录
      if (typeof directStore.query === 'function') {
        const directData: any = await directStore.query('SELECT key, value FROM keyv_cache WHERE key LIKE $1', [`%${directKey}%`]);
        console.log(`   直接设置记录数: ${directData.rows.length}`);
        directData.rows.forEach((row: any, index: number) => {
          console.log(`     ${index + 1}. Key="${row.key}", Value="${row.value}"`);
        });
      }
      
    } catch (error) {
      console.error('   对照组测试失败:', error);
    }
    
    console.log('\n=== 根本原因分析完成 ===');
  });
});