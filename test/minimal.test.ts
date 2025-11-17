// 最小化测试，直接使用 Keyv
import Keyv from 'keyv';
import PostgresStore from '@keyv/postgres';

describe('Minimal Keyv Test', () => {
  let cache: Keyv;

  beforeAll(async () => {
    // 创建 PostgresStore 实例
    const store = new PostgresStore({
      uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache'
    });
    
    // 使用 store 实例初始化 Keyv
    cache = new Keyv({ store });
    
    console.log('Keyv 初始化完成');
  });

  afterAll(async () => {
    if (cache) {
      await cache.clear();
    }
  });

  it('最基础的 set/get 测试', async () => {
    const key = 'minimal:test:' + Date.now();
    const value = 'minimal value';
    
    console.log('测试键:', key);
    console.log('测试值:', value);
    
    // 设置值
    console.log('开始设置...');
    const setResult = await cache.set(key, value);
    console.log('设置结果:', setResult);
    
    // 获取值
    console.log('开始获取...');
    const getResult = await cache.get(key);
    console.log('获取结果:', getResult);
    console.log('获取结果类型:', typeof getResult);
    
    expect(getResult).toBe(value);
  }, 10000);
});