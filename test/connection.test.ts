// 这个测试只检查连接，不依赖我们的模块
import PostgresStore from '@keyv/postgres';

describe('Database Connection Test', () => {
  let store: PostgresStore;

  beforeAll(async () => {
    try {
      store = new PostgresStore({
        uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
        table: 'connection_test_cache'
      });
      console.log('PostgresStore 创建成功');
    } catch (error) {
      console.error('PostgresStore 创建失败:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (store) {
      try {
        // 尝试清理
        await store.clear?.();
      } catch (error) {
        // 忽略清理错误
      }
    }
  });

  it('应该能够连接到数据库', async () => {
    console.log('测试基础连接...');
    
    try {
      // 尝试设置和获取
      await store.set('connection:test', 'test value');
      console.log('设置成功');
      
      const result = await store.get('connection:test');
      console.log('获取结果:', result);
      
      expect(result).toBe('test value');
    } catch (error) {
      console.error('连接测试失败:', error);
      throw error;
    }
  }, 15000);

  it('应该能够处理不同的数据类型', async () => {
    const key = 'type:test:' + Date.now();
    
    // 测试字符串
    await store.set(key + ':string', 'hello world');
    const strResult = await store.get(key + ':string');
    expect(strResult).toBe('hello world');
    
    // 测试对象
    const obj = { id: 1, name: 'test' };
    await store.set(key + ':object', JSON.stringify(obj));
    const objResult = await store.get(key + ':object');
    expect(objResult).toBe(JSON.stringify(obj));
  }, 10000);
});