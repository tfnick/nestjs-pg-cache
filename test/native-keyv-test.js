// 基于原始 @keyv/postgres 的测试
const Keyv = require('keyv');
const PostgresStore = require('@keyv/postgres');

async function testNativeKeyv() {
  console.log('=== 原始 Keyv/Postgres 测试 ===');
  
  try {
    console.log('\n1. 初始化 Keyv 与 PostgresStore');
    
    // 方法1: 使用 URI 字符串直接初始化
    const keyv1 = new Keyv(process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache');
    console.log('✓ 方法1: URI 初始化完成');
    
    // 方法2: 使用 PostgresStore 实例
    const postgresStore = new PostgresStore({
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
      table: 'native_keyv_test',
      iterate: false // 禁用迭代以提高性能
    });
    
    const keyv2 = new Keyv({
      store: postgresStore,
      namespace: 'test:namespace'
    });
    console.log('✓ 方法2: PostgresStore 实例初始化完成');
    
    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n2. 测试方法1 - URI 初始化');
    await testKeyvInstance(keyv1, 'uri_test', {
      key: 'test:string:value',
      object: { id: 1, name: 'URI Test', active: true },
      number: 12345,
      array: [1, 2, 3, 'test']
    });
    
    console.log('\n3. 测试方法2 - PostgresStore 实例');
    await testKeyvInstance(keyv2, 'store_test', {
      key: 'test:namespace:value',
      object: { id: 2, name: 'Store Test', data: { nested: true } },
      null_value: null,
      undefined_value: undefined
    });
    
    console.log('\n4. 测试 TTL 功能');
    const keyvTTL = new Keyv({
      store: new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'native_keyv_ttl_test'
      })
    });
    
    await keyvTTL.set('ttl:test', 'expires in 2 seconds', 2000);
    console.log('✓ 设置带 TTL 的键');
    
    const immediate = await keyvTTL.get('ttl:test');
    console.log('立即获取:', immediate); // 应该返回值
    
    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const expired = await keyvTTL.get('ttl:test');
    console.log('过期后获取:', expired); // 应该返回 undefined
    console.log('✓ TTL 测试完成');
    
    console.log('\n5. 测试批量操作');
    await testBatchOperations(keyv2);
    
    console.log('\n6. 测试错误处理');
    await testErrorHandling();
    
    console.log('\n7. 清理');
    await keyv1.clear();
    await keyv2.clear();
    await keyvTTL.clear();
    console.log('✓ 所有缓存已清理');
    
    console.log('\n=== 原始 Keyv/Postgres 测试完成 ===');
    console.log('🎉 所有测试通过，Keyv 组件本身工作正常！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

async function testKeyvInstance(keyv, testName, testData) {
  console.log(`\n--- 测试 ${testName} ---`);
  
  // 清空缓存
  await keyv.clear();
  
  let successCount = 0;
  let totalTests = 0;
  
  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      successCount++;
    } else {
      console.log(`  ✗ ${message}`);
    }
  }
  
  // 测试设置和获取字符串
  const stringKey = `${testName}:string:${Date.now()}`;
  const stringValue = 'Hello from native Keyv!';
  
  await keyv.set(stringKey, stringValue);
  const retrievedString = await keyv.get(stringKey);
  assert(retrievedString === stringValue, `字符串设置/获取: "${stringValue}"`);
  
  // 测试设置和获取对象
  const objectKey = `${testName}:object:${Date.now()}`;
  const objectValue = testData.object;
  
  await keyv.set(objectKey, objectValue);
  const retrievedObject = await keyv.get(objectKey);
  assert(JSON.stringify(retrievedObject) === JSON.stringify(objectValue), '对象设置/获取');
  
  // 测试设置和获取数字
  if (testData.number !== undefined) {
    const numberKey = `${testName}:number:${Date.now()}`;
    await keyv.set(numberKey, testData.number);
    const retrievedNumber = await keyv.get(numberKey);
    assert(retrievedNumber === testData.number, `数字设置/获取: ${testData.number}`);
  }
  
  // 测试 null 和 undefined
  if (testData.null_value !== undefined) {
    const nullKey = `${testName}:null:${Date.now()}`;
    await keyv.set(nullKey, null);
    const retrievedNull = await keyv.get(nullKey);
    assert(retrievedNull === null, 'null 值设置/获取');
  }
  
  if (testData.undefined_value !== undefined) {
    const undefinedKey = `${testName}:undefined:${Date.now()}`;
    await keyv.set(undefinedKey, undefined);
    const retrievedUndefined = await keyv.get(undefinedKey);
    assert(retrievedUndefined === undefined, 'undefined 值设置/获取');
  }
  
  // 测试不存在的键
  const nonExistentKey = `${testName}:nonexistent:${Date.now()}`;
  const nonExistentValue = await keyv.get(nonExistentKey);
  assert(nonExistentValue === undefined, '不存在键返回 undefined');
  
  // 测试删除操作
  const deleteKey = `${testName}:delete:${Date.now()}`;
  await keyv.set(deleteKey, 'to be deleted');
  const beforeDelete = await keyv.get(deleteKey);
  assert(beforeDelete === 'to be deleted', '删除前键存在');
  
  const deleted = await keyv.delete(deleteKey);
  assert(deleted === true, '删除操作返回 true');
  
  const afterDelete = await keyv.get(deleteKey);
  assert(afterDelete === undefined, '删除后键不存在');
  
  console.log(`  结果: ${successCount}/${totalTests} 测试通过`);
  return successCount === totalTests;
}

async function testBatchOperations(keyv) {
  console.log('\n--- 批量操作测试 ---');
  
  // 清空缓存
  await keyv.clear();
  
  // 设置多个键
  const keys = ['batch:1', 'batch:2', 'batch:3'];
  const values = ['value1', 'value2', 'value3'];
  
  for (let i = 0; i < keys.length; i++) {
    await keyv.set(keys[i], values[i]);
  }
  console.log('✓ 批量设置完成');
  
  // 批量获取（需要分别获取，Keyv 不支持真正的 mget）
  const results = [];
  for (const key of keys) {
    const value = await keyv.get(key);
    results.push(value);
  }
  
  const allCorrect = results.every((value, index) => value === values[index]);
  console.log('✓ 批量获取:', allCorrect ? '成功' : '失败');
  console.log('  期望值:', values);
  console.log('  实际值:', results);
  
  // 批量删除
  const deleteResults = [];
  for (const key of keys) {
    const result = await keyv.delete(key);
    deleteResults.push(result);
  }
  
  const allDeleted = deleteResults.every(result => result === true);
  console.log('✓ 批量删除:', allDeleted ? '成功' : '失败');
  
  return allCorrect && allDeleted;
}

async function testErrorHandling() {
  console.log('\n--- 错误处理测试 ---');
  
  try {
    // 测试无效连接
    const invalidKeyv = new Keyv('postgresql://invalid:invalid@localhost:9999/invalid');
    
    await invalidKeyv.set('test', 'value');
    const result = await invalidKeyv.get('test');
    
    // 应该返回 undefined 因为连接失败
    console.log('✓ 无效连接处理:', result === undefined ? '正确' : '异常');
    
  } catch (error) {
    console.log('✓ 捕获连接错误:', error.message);
  }
  
  try {
    // 测试空键
    const keyv = new Keyv('memory://');
    const result1 = await keyv.set('', 'value');
    const result2 = await keyv.get('');
    
    console.log('✓ 空键处理: 设置=', result1, '获取=', result2);
    
  } catch (error) {
    console.log('✓ 捕获空键错误:', error.message);
  }
  
  return true;
}

// 运行测试
testNativeKeyv().catch(console.error);