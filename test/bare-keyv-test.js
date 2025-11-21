// 独立测试 Keyv，不通过我们的服务
const Keyv = require('keyv');

async function bareKeyvTest() {
  console.log('=== 独立 Keyv 测试 ===');
  
  let keyv;
  
  try {
    console.log('\n=== 初始化 Keyv ===');
    keyv = new Keyv({
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'bare_keyv_test',
      namespace: ''
    });
    
    // 等待连接
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Keyv 选项:', {
      namespace: keyv.opts.namespace,
      store: keyv.opts.store ? 'exists' : 'missing',
      ttl: keyv.opts.ttl
    });
    
    // 清空表
    try {
      await keyv.clear();
      console.log('表已清空');
    } catch (error) {
      console.log('清空失败:', error.message);
    }
    
    console.log('\n=== 测试基础 set/get ===');
    const testKey = 'bare:test:key';
    const testValue = { data: 'bare keyv test', timestamp: Date.now() };
    
    console.log('设置:', testKey, '=', testValue);
    const setResult = await keyv.set(testKey, testValue);
    console.log('设置结果:', setResult);
    
    // 检查数据库实际存储
    const store = keyv.opts.store;
    if (store && typeof store.query === 'function') {
      try {
        const rows = await store.query('SELECT key, value FROM bare_keyv_test');
        console.log('数据库中的实际存储:');
        rows.forEach(row => {
          console.log(`  键: "${row.key}"`);
          console.log(`  值: "${row.value}"`);
          try {
            const parsed = JSON.parse(row.value);
            console.log(`  解析:`, parsed);
          } catch (e) {
            console.log(`  解析失败: ${e.message}`);
          }
        });
      } catch (dbError) {
        console.error('查询数据库失败:', dbError);
      }
    }
    
    console.log('\n=== 等待后获取 ===');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('获取:', testKey);
    const getResult = await keyv.get(testKey);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    const success = JSON.stringify(getResult) === JSON.stringify(testValue);
    console.log('独立 Keyv 测试', success ? '✅ 通过' : '❌ 失败');
    
    if (keyv) {
      await keyv.clear();
    }
    
  } catch (error) {
    console.error('独立 Keyv 测试失败:', error);
    if (keyv) {
      await keyv.clear();
    }
  }
}

bareKeyvTest();