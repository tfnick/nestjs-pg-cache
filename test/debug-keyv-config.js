const Keyv = require('keyv');
const PostgresStore = require('@keyv/postgres');

async function debugKeyvConfig() {
  console.log('=== 调试 Keyv 配置 ===');
  
  try {
    console.log('\n=== 测试1: 默认 Keyv 配置 ===');
    const keyv1 = new Keyv({
      store: new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'debug_keyv_config_1'
      })
    });
    
    const testKey1 = 'test:default:key';
    const testValue1 = 'default value';
    
    console.log('设置:', testKey1, '=', testValue1);
    await keyv1.set(testKey1, testValue1);
    
    const store1 = keyv1.opts.store;
    const rows1 = await store1.query('SELECT key, value FROM debug_keyv_config_1');
    console.log('数据库记录:');
    rows1.forEach(row => console.log(`  ${row.key} = ${row.value}`));
    
    const getResult1 = await keyv1.get(testKey1);
    console.log('获取结果:', getResult1);
    
    await keyv1.clear();
    
    console.log('\n=== 测试2: 明确设置 namespace ===');
    const keyv2 = new Keyv({
      store: new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'debug_keyv_config_2'
      }),
      namespace: ''
    });
    
    const testKey2 = 'test:namespace:key';
    const testValue2 = 'namespace value';
    
    console.log('设置:', testKey2, '=', testValue2);
    await keyv2.set(testKey2, testValue2);
    
    const store2 = keyv2.opts.store;
    const rows2 = await store2.query('SELECT key, value FROM debug_keyv_config_2');
    console.log('数据库记录:');
    rows2.forEach(row => console.log(`  ${row.key} = ${row.value}`));
    
    const getResult2 = await keyv2.get(testKey2);
    console.log('获取结果:', getResult2);
    
    await keyv2.clear();
    
    console.log('\n=== 测试3: 检查 opts 配置 ===');
    console.log('keyv1 opts:', {
      namespace: keyv1.opts.namespace,
      store: keyv1.opts.store ? 'exists' : 'missing'
    });
    console.log('keyv2 opts:', {
      namespace: keyv2.opts.namespace,
      store: keyv2.opts.store ? 'exists' : 'missing'
    });
    
    console.log('\n=== 测试4: 尝试原始数据库键名 ===');
    const keyv4 = new Keyv({
      store: new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'debug_keyv_config_4'
      }),
      namespace: ''
    });
    
    // 先手动插入数据
    const store4 = keyv4.opts.store;
    await store4.query('INSERT INTO debug_keyv_config_4 (key, value) VALUES ($1, $2)', ['manual:insert:key', 'manual value']);
    
    // 检查数据库
    const rows4 = await store4.query('SELECT key, value FROM debug_keyv_config_4');
    console.log('手动插入后的数据库记录:');
    rows4.forEach(row => console.log(`  ${row.key} = ${row.value}`));
    
    // 尝试获取
    const getResult4a = await keyv4.get('manual:insert:key');
    console.log('尝试获取 manual:insert/key:', getResult4a);
    
    const getResult4b = await keyv4.get('keyv:manual:insert:key');
    console.log('尝试获取 keyv:manual:insert/key:', getResult4b);
    
    await keyv4.clear();
    
  } catch (error) {
    console.error('调试失败:', error);
  }
}

debugKeyvConfig();