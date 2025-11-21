const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function runFixedTests() {
  console.log('=== 开始 Fixed 测试 ===');
  
  let module;
  let service;
  
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'fixed_test_cache',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get(PgCacheService);
    console.log('服务初始化完成');

    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 测试计数器
    let passedTests = 0;
    let totalTests = 0;

    function runTest(testName, testFn) {
      totalTests++;
      try {
        testFn();
        console.log(`✓ ${testName}`);
        passedTests++;
      } catch (error) {
        console.log(`✗ ${testName}:`, error.message);
      }
    }

    // 测试1: 字符串缓存
    console.log('\n=== 测试字符串缓存 ===');
    await (async () => {
      const key = 'fixed:string:' + Date.now();
      const value = 'Hello, World!';
      
      console.log('键:', key);
      console.log('值:', value);

      const setResult = await service.set(key, value);
      runTest('设置字符串值', () => {
        if (setResult !== 'OK') throw new Error(`期望 'OK'，得到 ${setResult}`);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      runTest('获取字符串值', () => {
        if (getResult !== value) throw new Error(`期望 '${value}'，得到 '${getResult}'`);
      });
    })();

    // 测试2: 对象缓存
    console.log('\n=== 测试对象缓存 ===');
    await (async () => {
      const key = 'fixed:object:' + Date.now();
      const value = { id: 1, name: 'Test User', active: true };
      
      console.log('键:', key);
      console.log('值:', value);

      const setResult = await service.set(key, value);
      runTest('设置对象值', () => {
        if (setResult !== 'OK') throw new Error(`期望 'OK'，得到 ${setResult}`);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const getResult = await service.get(key);
      console.log('获取结果:', getResult);
      console.log('获取结果类型:', typeof getResult);
      
      runTest('获取对象值', () => {
        if (JSON.stringify(getResult) !== JSON.stringify(value)) {
          throw new Error(`期望 ${JSON.stringify(value)}，得到 ${JSON.stringify(getResult)}`);
        }
      });
    })();

    // 测试3: 不存在的键
    console.log('\n=== 测试不存在的键 ===');
    await (async () => {
      const result = await service.get('fixed:nonexistent');
      runTest('处理不存在的键', () => {
        if (result !== null) throw new Error(`期望 null，得到 ${result}`);
      });
    })();

    // 测试4: 删除操作
    console.log('\n=== 测试删除操作 ===');
    await (async () => {
      const key = 'fixed:delete:' + Date.now();
      const value = 'to be deleted';
      
      await service.set(key, value);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const beforeDelete = await service.get(key);
      runTest('删除前验证', () => {
        if (beforeDelete !== value) throw new Error(`删除前验证失败`);
      });

      const deleteResult = await service.del(key);
      runTest('删除键', () => {
        if (deleteResult !== 1) throw new Error(`期望 1，得到 ${deleteResult}`);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const afterDelete = await service.get(key);
      runTest('删除后验证', () => {
        if (afterDelete !== null) throw new Error(`期望 null，得到 ${afterDelete}`);
      });
    })();

    // 测试5: 批量获取
    console.log('\n=== 测试批量获取 ===');
    await (async () => {
      const timestamp = Date.now();
      const keys = [
        `fixed:mget:1:${timestamp}`,
        `fixed:mget:2:${timestamp}`,
        `fixed:mget:3:${timestamp}`
      ];
      const values = ['value1', 'value2', 'value3'];
      
      // 设置多个值
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const results = await service.mget(keys);
      console.log('批量获取结果:', results);
      
      runTest('批量获取值', () => {
        for (let i = 0; i < results.length; i++) {
          if (results[i] !== values[i]) {
            throw new Error(`批量获取失败：期望 ${JSON.stringify(values)}，得到 ${JSON.stringify(results)}`);
          }
        }
      });
      
      // 清理
      await service.del(keys);
    })();

    // 测试6: Redis 兼容方法 - exists
    console.log('\n=== 测试 exists 方法 ===');
    await (async () => {
      const key = 'fixed:exists:' + Date.now();
      
      const exists1 = await service.exists(key);
      runTest('检查不存在的键', () => {
        if (exists1 !== 0) throw new Error(`期望 0，得到 ${exists1}`);
      });

      await service.set(key, 'value');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const exists2 = await service.exists(key);
      runTest('检查存在的键', () => {
        if (exists2 !== 1) throw new Error(`期望 1，得到 ${exists2}`);
      });
    })();

    // 测试7: Redis 兼容方法 - setnx
    console.log('\n=== 测试 setnx 方法 ===');
    await (async () => {
      const key = 'fixed:setnx:' + Date.now();
      const value1 = 'first';
      const value2 = 'second';

      const result1 = await service.setnx(key, value1);
      runTest('第一次 setnx', () => {
        if (result1 !== 1) throw new Error(`期望 1，得到 ${result1}`);
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check1 = await service.get(key);
      runTest('验证第一次 setnx', () => {
        if (check1 !== value1) throw new Error(`期望 '${value1}'，得到 '${check1}'`);
      });

      const result2 = await service.setnx(key, value2);
      runTest('第二次 setnx', () => {
        if (result2 !== 0) throw new Error(`期望 0，得到 ${result2}`);
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check2 = await service.get(key);
      runTest('验证值不变', () => {
        if (check2 !== value1) throw new Error(`期望 '${value1}'，得到 '${check2}'`);
      });
    })();

    // 测试8: 哈希操作
    console.log('\n=== 测试哈希操作 ===');
    await (async () => {
      const hashKey = 'fixed:hash:' + Date.now();
      const field = 'test_field';
      const value = 'hash value';

      const hsetResult = await service.hset(hashKey, field, value);
      runTest('hset 操作', () => {
        if (hsetResult !== 'OK') throw new Error(`期望 'OK'，得到 ${hsetResult}`);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const hgetResult = await service.hget(hashKey, field);
      runTest('hget 操作', () => {
        if (hgetResult !== value) throw new Error(`期望 '${value}'，得到 '${hgetResult}'`);
      });

      const hexistsResult = await service.hexists(hashKey, field);
      runTest('hexists 操作', () => {
        if (hexistsResult !== 1) throw new Error(`期望 1，得到 ${hexistsResult}`);
      });

      const hdelResult = await service.hdel(hashKey, field);
      runTest('hdel 操作', () => {
        if (hdelResult !== 1) throw new Error(`期望 1，得到 ${hdelResult}`);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const hgetAfterDelete = await service.hget(hashKey, field);
      runTest('删除后 hget', () => {
        if (hgetAfterDelete !== null) throw new Error(`期望 null，得到 ${hgetAfterDelete}`);
      });
    })();

    // 清理
    await service.reset();
    await module.close();
    
    console.log('\n=== 测试总结 ===');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log('❌ 有测试失败');
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
    if (module) {
      await module.close();
    }
  }
}

runFixedTests();