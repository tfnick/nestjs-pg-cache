const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function debugServiceConfig() {
  console.log('=== 调试服务配置 ===');
  
  let serviceModule;
  let service;
  
  try {
    console.log('\n1. 初始化 PgCacheService');
    serviceModule = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'debug_service_config_test',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = serviceModule.get(PgCacheService);
    console.log('✓ PgCacheService 初始化完成');
    
    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n2. 检查服务配置');
    const client = service.getClient();
    console.log('客户端存在:', !!client);
    console.log('客户端类型:', client.constructor.name);
    console.log('客户端选项:', client.opts ? '存在' : '不存在');
    
    if (client.opts) {
      console.log('  namespace:', client.opts.namespace);
      console.log('  ttl:', client.opts.ttl);
      console.log('  compression:', client.opts.compression);
      console.log('  serialize:', client.opts.serialize);
      console.log('  deserialize:', client.opts.deserialize);
      console.log('  store:', client.opts.store ? '存在' : '不存在');
      
      if (client.opts.store) {
        console.log('  store 类型:', client.opts.store.constructor.name);
        console.log('  store 选项:', client.opts.store.opts || '无选项');
        
        if (client.opts.store.opts) {
          console.log('    uri:', client.opts.store.opts.uri ? '存在' : '不存在');
          console.log('    table:', client.opts.store.opts.table);
          console.log('    useUnloggedTable:', client.opts.store.opts.useUnloggedTable);
        }
        
        // 检查是否有 query 方法（PostgreSQL 特有）
        console.log('  store.query 方法:', typeof client.opts.store.query === 'function' ? '存在' : '不存在');
        
        // 尝试直接查询数据库
        if (typeof client.opts.store.query === 'function') {
          try {
            console.log('\n3. 测试数据库连接');
            const result = await client.opts.store.query('SELECT 1 as test');
            console.log('数据库查询成功:', result);
            
            // 检查表是否存在
            const tables = await client.opts.store.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name LIKE '%debug%'
            `);
            console.log('相关表:', tables);
            
            // 检查我们的表
            const targetTable = client.opts.store.opts.table || 'keyv_cache';
            const tableExists = await client.opts.store.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
              )
            `, [targetTable]);
            console.log(`表 ${targetTable} 存在:`, tableExists[0].exists);
            
          } catch (error) {
            console.error('数据库查询失败:', error.message);
          }
        }
      }
    }
    
    console.log('\n4. 测试基础操作');
    const testKey = 'debug:config:test';
    const testValue = { config: 'test', timestamp: Date.now() };
    
    console.log('设置键值:', testKey, '=', testValue);
    const setResult = await service.set(testKey, testValue);
    console.log('设置结果:', setResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取键值:', testKey);
    const getResult = await service.get(testKey);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    // 尝试直接使用客户端
    console.log('\n5. 直接使用底层客户端测试');
    const directSet = await client.set('direct:test', 'direct value');
    console.log('直接设置结果:', directSet);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const directGet = await client.get('direct:test');
    console.log('直接获取结果:', directGet);
    
    // 再次检查数据库
    if (client.opts.store && typeof client.opts.store.query === 'function') {
      try {
        const allRecords = await client.opts.store.query('SELECT key, value FROM ' + (client.opts.store.opts.table || 'keyv_cache'));
        console.log('数据库中的所有记录:');
        if (allRecords.length === 0) {
          console.log('  (空)');
        } else {
          allRecords.forEach(row => {
            console.log(`  键: "${row.key}"`);
            console.log(`  值: "${row.value}"`);
          });
        }
      } catch (error) {
        console.error('查询数据库记录失败:', error);
      }
    }
    
    console.log('\n6. 服务统计信息');
    console.log('hasKey 方法存在:', typeof service.hasKey === 'function');
    console.log('exists 方法存在:', typeof service.exists === 'function');
    console.log('getValue 方法存在:', typeof service.getValue === 'function');
    
    const hasKeyResult = await service.hasKey(testKey);
    console.log('hasKey 结果:', hasKeyResult);
    
    const existsResult = await service.exists(testKey);
    console.log('exists 结果:', existsResult);
    
    const getValueResult = await service.getValue(testKey);
    console.log('getValue 结果:', getValueResult);
    
    console.log('\n7. 清理');
    await service.reset();
    console.log('✓ 服务重置完成');
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
    console.error('错误堆栈:', error.stack);
  } finally {
    if (serviceModule) {
      await serviceModule.close();
    }
  }
}

debugServiceConfig().catch(console.error);