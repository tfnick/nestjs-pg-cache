import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('Debug Initialization Test', () => {
  let service: PgCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    console.log('\n=== 调试初始化过程 ===');
    
    // 步骤1：创建模块
    console.log('1. 创建测试模块...');
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'debug_init_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();
    console.log('   ✅ 模块创建完成');

    // 步骤2：获取服务
    console.log('2. 获取PgCacheService...');
    service = module.get<PgCacheService>(PgCacheService);
    console.log('   ✅ 服务获取完成');
    
    // 步骤3：等待初始化
    console.log('3. 等待服务初始化...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('   ✅ 初始化等待完成');
    
    // 步骤4：详细检查服务状态
    console.log('4. 检查服务状态...');
    const cacheClient = (service as any).cache;
    console.log('   - Cache实例:', !!cacheClient);
    console.log('   - Cache类型:', cacheClient?.constructor?.name);
    console.log('   - Cache选项:', !!cacheClient?.opts);
    console.log('   - URI:', cacheClient?.opts?.uri ? '✅ 有' : '❌ 无');
    console.log('   - Store:', !!cacheClient?.opts?.store);
    console.log('   - Store类型:', cacheClient?.opts?.store?.constructor?.name);
    
    const store = cacheClient?.opts?.store;
    if (store) {
      console.log('   - Store选项:', !!store?.opts);
      console.log('   - Store URI:', store?.opts?.uri ? '✅ 有' : '❌ 无');
      console.log('   - Store Table:', store?.opts?.table || '默认');
      console.log('   - Store has query:', typeof store?.query === 'function' ? '✅ 有' : '❌ 无');
      console.log('   - Store has connect:', typeof store?.connect === 'function' ? '✅ 有' : '❌ 无');
      
      // 步骤5：测试数据库连接
      console.log('5. 测试数据库连接...');
      try {
        if (typeof store?.query === 'function') {
          const testResult = await store.query('SELECT 1 as test');
          console.log('   ✅ Store.query 测试成功:', testResult?.rows?.[0]?.test);
        } else if (typeof store?.connect === 'function') {
          const query = await store.connect();
          const testResult = await query('SELECT 1 as test');
          console.log('   ✅ Store.connect 测试成功:', testResult?.rows?.[0]?.test);
        } else {
          console.log('   ❌ Store无可用的查询方法');
        }
      } catch (error) {
        console.log('   ❌ 数据库连接测试失败:', (error as Error).message);
      }
    } else {
      console.log('   ❌ 没有Store，可能在内存模式');
    }
    
    console.log('=== 初始化调试完成 ===');
  });

  afterAll(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  it('调试真实的数据流', async () => {
    console.log('\n=== 调试数据流 ===');
    
    const key = 'debug:data:flow:' + Date.now();
    const value = 'Debug Data Flow Test';
    
    console.log(`1. 设置数据: ${key} = ${value}`);
    
    // 设置数据
    const setResult = await service.set(key, value);
    console.log(`   设置结果: ${setResult}`);
    expect(setResult).toBe('OK');
    
    // 等待数据持久化
    console.log('2. 等待数据持久化...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 获取数据
    console.log('3. 获取数据...');
    const getResult = await service.get(key);
    console.log(`   获取结果: ${getResult}`);
    expect(getResult).toBe(value);
    
    // 直接检查数据库
    console.log('4. 直接检查数据库...');
    const cacheClient = (service as any).cache;
    const store = cacheClient?.opts?.store;
    
    if (store && typeof store?.query === 'function') {
      try {
        const data = await store.query('SELECT key, value FROM debug_init_cache ORDER BY created_at DESC LIMIT 5');
        console.log(`   数据库记录数: ${data?.rows?.length || 0}`);
        
        if (data?.rows && data.rows.length > 0) {
          console.log('   数据库记录:');
          data.rows.forEach((row: any, index: number) => {
            console.log(`     ${index + 1}. Key="${row.key}", Value="${row.value}"`);
          });
          
          // 查找我们的记录
          const ourRecord = data.rows.find((row: any) => row.key.includes(key));
          if (ourRecord) {
            console.log(`   ✅ 找到我们的记录: Key="${ourRecord.key}"`);
          } else {
            console.log(`   ❌ 未找到包含 "${key}" 的记录`);
          }
        } else {
          console.log('   ❌ 数据库中没有记录');
        }
        
      } catch (error) {
        console.error('   数据库查询失败:', error);
      }
    } else {
      console.log('   ❌ 无法访问数据库存储');
    }
    
    console.log('✅ 数据流调试完成');
  });
});