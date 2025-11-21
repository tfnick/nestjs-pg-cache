const { Test } = require('@nestjs/testing');
const { PgCacheModule, PgCacheService } = require('../dist');

async function checkDatabase() {
  console.log('=== 检查数据库表 ===');
  
  let module;
  let service;
  
  try {
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRoot({
          cache: {
            uri: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_cache',
            table: 'check_db_cache',
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

    // 获取底层存储
    const client = service.getClient();
    const store = client.opts.store;
    
    console.log('\n=== 检查存储配置 ===');
    console.log('存储存在:', !!store);
    if (store) {
      console.log('存储类型:', store.constructor.name);
      console.log('存储选项:', store.opts || '无选项');
    }
    
    // 检查表是否存在
    if (store && typeof store.query === 'function') {
      try {
        console.log('\n=== 检查表是否存在 ===');
        const tableCheck = await store.query(`
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name LIKE '%cache%'
        `);
        console.log('相关表:');
        tableCheck.forEach(row => {
          console.log(`  表名: ${row.table_name}, 类型: ${row.table_type}`);
        });
        
        console.log('\n=== 检查目标表结构 ===');
        const targetTable = store.opts?.table || 'keyv_cache';
        const tableSchema = await store.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [targetTable]);
        
        if (tableSchema.length > 0) {
          console.log(`表 ${targetTable} 结构:`);
          tableSchema.forEach(row => {
            console.log(`  列: ${row.column_name}, 类型: ${row.data_type}, 可空: ${row.is_nullable}`);
          });
        } else {
          console.log(`表 ${targetTable} 不存在`);
        }
        
      } catch (error) {
        console.error('检查数据库失败:', error);
      }
      
      // 尝试手动创建表
      console.log('\n=== 尝试手动创建表 ===');
      try {
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS check_db_cache (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT NOT NULL,
            expires INTEGER
          )
        `;
        await store.query(createTableSQL);
        console.log('表创建成功');
      } catch (error) {
        console.error('创建表失败:', error);
      }
      
      // 测试直接数据库操作
      console.log('\n=== 测试直接数据库操作 ===');
      try {
        const insertSQL = 'INSERT INTO check_db_cache (key, value) VALUES ($1, $2) RETURNING *';
        const insertResult = await store.query(insertSQL, ['test:direct:insert', 'Direct Insert Value']);
        console.log('直接插入结果:', insertResult);
        
        const selectSQL = 'SELECT * FROM check_db_cache WHERE key = $1';
        const selectResult = await store.query(selectSQL, ['test:direct:insert']);
        console.log('直接查询结果:', selectResult);
        
        const deleteSQL = 'DELETE FROM check_db_cache WHERE key = $1';
        await store.query(deleteSQL, ['test:direct:insert']);
        console.log('直接删除成功');
        
      } catch (error) {
        console.error('直接数据库操作失败:', error);
      }
    }
    
    await service.reset();
    await module.close();
    
  } catch (error) {
    console.error('检查失败:', error);
    if (module) {
      await module.close();
    }
  }
}

checkDatabase();