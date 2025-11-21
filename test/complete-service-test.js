const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function completeServiceTest() {
  console.log('=== 完整服务测试（验证修复） ===');
  
  let module;
  let service;
  
  try {
    console.log('\n1. 初始化服务');
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'complete_service_test',
            namespace: '',
            useUnloggedTable: false,
            ttl: 60000
          }
        })
      ]
    }).compile();

    service = module.get(PgCacheService);
    console.log('✓ 服务�完成');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let totalTests = 0;
    let passedTests = 0;
    
    function runTest(testName, testFn) {
      totalTests++;
      try {
        testFn();
        passedTests++;
        console.log(`✓ ${testName}`);
      } catch (error) {
        console.log(`✗ ${testName}: ${error.message}`);
      }
    }
    
    // 基础缓存操作
    console.log('\n2. 基础缓存操作');
    
    // 字符串测试
    await (async () => {
      const key = 'test:string:' + Date.now();
      const value = 'Hello, World!';
      
      const setResult = await service.set(key, value);
      runTest('字符串设置', () => { if (setResult !== 'OK') throw new Error(`期望 'OK'，得到 ${setResult}`); });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const getResult = await service.get(key);
      runTest('字符串获取', () => { if (getResult !== value) throw new Error(`期望 '${value}'，得到 '${getResult}'`); });
    })();
    
    // 对象测试
    await (async () => {
      const key = 'test:object:' + Date.now();
      const value = { id: 1, name: 'Test User', active: true };
      
      const setResult = await service.set(key, value);
      runTest('对象设置', () => { if (setResult !== 'OK') throw new Error(`期望 'OK'，得到 ${setResult}`); });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const getResult = await service.get(key);
      runTest('对象获取', () => { 
        if (JSON.stringify(getResult) !== JSON.stringify(value)) {
          throw new Error(`期望 ${JSON.stringify(value)}，得到 ${JSON.stringify(getResult)}`);
        }
      });
    })();
    
    // 不存在键测试
    await (async () => {
      const result = await service.get('test:nonexistent:' + Date.now());
      runTest('不存在键', () => { if (result !== null) throw new Error(`期望 null，得到 ${result}`); });
    })();
    
    // 删除操作测试
    await (async () => {
      const key = 'test:delete:' + Date.now();
      const value = 'to be deleted';
      
      await service.set(key, value);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const beforeDelete = await service.get(key);
      runTest('删除前验证', () => { if (beforeDelete !== value) throw new Error('删除前验证失败'); });
      
      const deleteResult = await service.del(key);
      runTest('删除操作', () => { if (deleteResult !== 1) throw new Error(`期望 1，得到 ${deleteResult}`); });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterDelete = await service.get(key);
      runTest('删除后验证', () => { if (afterDelete !== null) throw new Error(`期望 null，得到 ${afterDelete}`); });
    })();
    
    // 批量获取测试
    await (async () => {
      const timestamp = Date.now();
      const keys = [
        `test:mget:1:${timestamp}`,
        `test:mget:2:${timestamp}`,
        `test:mget:3:${timestamp}`
      ];
      const values = ['value1', 'value2', 'value3'];
      
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i]);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = await service.mget(keys);
      runTest('批量获取', () => {
        for (let i = 0; i < results.length; i++) {
          if (results[i] !== values[i]) {
            throw new Error(`批量获取失败：期望 ${JSON.stringify(values)}，得到 ${JSON.stringify(results)}`);
          }
        }
      });
      
      await service.del(keys);
    })();
    
    // Redis 兼容方法
    console.log('\n3. Redis 兼容方法');
    
    // exists 测试
    await (async () => {
      const key = 'test:exists:' + Date.now();
      
      const exists1 = await service.exists(key);
      runTest('exists - 不存在键', () => { if (exists1 !== 0) throw new Error(`期望 0，得到 ${exists1}`); });
      
      await service.set(key, 'value');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const exists2 = await service.exists(key);
      runTest('exists - 存在键', () => { if (exists2 !== 1) throw new Error(`期望 1，得到 ${exists2}`); });
    })();
    
    // setnx 测试
    await (async () => {
      const key = 'test:setnx:' + Date.now();
      const value1 = 'first';
      const value2 = 'second';

      const result1 = await service.setnx(key, value1);
      runTest('setnx - 第一次', () => { if (result1 !== 1) throw new Error(`期望 1，得到 ${result1}`); });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check1 = await service.get(key);
      runTest('setnx - 验证第一次', () => { if (check1 !== value1) throw new Error(`期望 '${value1}'，得到 '${check1}'`); });

      const result2 = await service.setnx(key, value2);
      runTest('setnx - 第二次', () => { if (result2 !== 0) throw new Error(`期望 0，得到 ${result2}`); });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      const check2 = await service.get(key);
      runTest('setnx - 验证值不变', () => { if (check2 !== value1) throw new Error(`期望 '${value1}'，得到 '${check2}'`); });
    })();
    
    // strlen 测试
    await (async () => {
      const key = 'test:strlen:' + Date.now();
      const stringValue = 'Hello, NestJS!';
      const objectValue = { message: 'test' };
      
      await service.set(key + ':string', stringValue);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const length1 = await service.strlen(key + ':string');
      runTest('strlen - 字符串', () => { if (length1 !== stringValue.length) throw new Error(`期望 ${stringValue.length}，得到 ${length1}`); });

      await service.set(key + ':object', objectValue);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const length2 = await service.strlen(key + ':object');
      runTest('strlen - 对象', () => { 
        const expectedLength = JSON.stringify(objectValue).length;
        if (length2 !== expectedLength) throw new Error(`期望 ${expectedLength}，得到 ${length2}`);
      });
    })();
    
    // 哈希操作
    console.log('\n4. 哈希操作');
    
    await (async () => {
      const hashKey = 'test:hash:' + Date.now();
      const field = 'test_field';
      const value = 'hash value';

      const hsetResult = await service.hset(hashKey, field, value);
      runTest('hset 操作', () => { if (hsetResult !== 'OK') throw new Error(`期望 'OK'，得到 ${hsetResult}`); });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const hgetResult = await service.hget(hashKey, field);
      runTest('hget 操作', () => { if (hgetResult !== value) throw new Error(`期望 '${value}'，得到 '${hgetResult}'`); });

      const hexistsResult = await service.hexists(hashKey, field);
      runTest('hexists 操作', () => { if (hexistsResult !== 1) throw new Error(`期望 1，得到 ${hexistsResult}`); });

      const hdelResult = await service.hdel(hashKey, field);
      runTest('hdel 操作', () => { if (hdelResult !== 1) throw new Error(`期望 1，得到 ${hdelResult}`); });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const hgetAfterDelete = await service.hget(hashKey, field);
      runTest('删除后 hget', () => { if (hgetAfterDelete !== null) throw new Error(`期望 null，得到 ${hgetAfterDelete}`); });
    })();
    
    // 向后兼容方法
    console.log('\n5. 向后兼容方法');
    
    // getValue/setValue 测试
    await (async () => {
      const key = 'test:compat:' + Date.now();
      const value = { test: 'compatibility' };

      const setResult = await service.setValue(key, value);
      runTest('setValue', () => { if (setResult !== true) throw new Error(`期望 true，得到 ${setResult}`); });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const getResult = await service.getValue(key);
      runTest('getValue', () => { 
        if (JSON.stringify(getResult) !== JSON.stringify(value)) {
          throw new Error(`期望 ${JSON.stringify(value)}，得到 ${JSON.stringify(getResult)}`);
        }
      });
    })();
    
    // clearCache 测试
    await (async () => {
      const key1 = 'test:clear1:' + Date.now();
      const key2 = 'test:clear2:' + Date.now();
      
      await service.setValue(key1, 'value1');
      await service.setValue(key2, 'value2');
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      const beforeClear1 = await service.getValue(key1);
      const beforeClear2 = await service.getValue(key2);
      runTest('清空前数据验证', () => { 
        if (beforeClear1 !== 'value1' || beforeClear2 !== 'value2') {
          throw new Error('清空验证失败');
        }
      });

      await service.clearCache();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const afterClear1 = await service.getValue(key1);
      const afterClear2 = await service.getValue(key2);
      runTest('clearCache', () => { 
        if (afterClear1 !== undefined || afterClear2 !== undefined) {
          throw new Error(`期望 undefined，得到 [${afterClear1}, ${afterClear2}]`);
        }
      });
    })();

    console.log('\n6. 测试总结');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！服务修复成功！');
    } else {
      console.log('❌ 仍有测试失败');
    }
    
    await service.reset();
    await module.close();
    
  } catch (error) {
    console.error('完整测试失败:', error);
    if (module) {
      await module.close();
    }
  }
}

completeServiceTest();