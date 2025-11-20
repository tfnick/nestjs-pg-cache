import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule } from '../src/pg-cache.module';
import { PgCacheService } from '../src/services/pg-cache.service';

describe('Business Config Exact Test', () => {
  let module: TestingModule;
  let cacheService: PgCacheService;

  const TEST_URI = 'postgresql://postgres:123456@localhost:5432/postgres';
  const TEST_TABLE = 'keyv_cache';

  afterEach(async () => {
    if (module) {
      await cacheService.reset();
      await module.close();
    }
  });

  it('should test business exact configuration with table name check', async () => {
    console.log('=== Testing Exact Business Configuration ===');
    
    // 完全复制你的业务配置
    module = await Test.createTestingModule({
      imports: [
        PgCacheModule.forRootAsync({
          global: true,
          useFactory: () => {
            return {
              cache: {
                uri: TEST_URI,
                namespace: '',
                table: TEST_TABLE,
                useUnloggedTable: false,
                ttl: 3600000, // 1小时
              },
            };
          },
        }),
      ],
    }).compile();

    cacheService = module.get<PgCacheService>(PgCacheService);

    // 等待初始化完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 获取内部配置
    const options = (cacheService as any).options;
    console.log('Service options:', JSON.stringify(options, null, 2));

    const cache = (cacheService as any).cache;
    const keyvOptions = cache?.opts;
    console.log('Keyv options:', JSON.stringify(keyvOptions, null, 2));

    // 测试基本操作
    console.log('Testing basic cache operations...');
    
    try {
      const setResult = await cacheService.set('business:test', 'business_value');
      console.log('✅ Set result:', setResult);
      
      const getValue = await cacheService.get('business:test');
      console.log('✅ Get result:', getValue);
      
      if (setResult === 'OK' && getValue === 'business_value') {
        console.log('✅ Basic operations successful');
        
        // 检查表是否真的创建了
        const store = keyvOptions?.store;
        if (store) {
          try {
            // 直接查询 PostgreSQL 系统表
            const tableExists = await store.query(`
              SELECT table_name, table_schema 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              ORDER BY table_name
            `);
            
            console.log('📋 All tables in database:');
            tableExists.forEach((row: any) => {
              console.log(`  - ${row.table_schema}.${row.table_name}`);
            });
            
            // 检查我们的表是否存在
            const targetTable = tableExists.find((row: any) => row.table_name === TEST_TABLE);
            if (targetTable) {
              console.log('✅ Target table exists:', targetTable.table_name);
              
              // 检查表结构
              const tableStructure = await store.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = '${TEST_TABLE}'
                ORDER BY ordinal_position
              `);
              
              console.log('📋 Table structure:');
              tableStructure.forEach((col: any) => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
              });
              
              // 检查表中的数据
              const dataCount = await store.query(`
                SELECT COUNT(*) as count 
                FROM public.${TEST_TABLE}
              `);
              console.log('📊 Data count in table:', dataCount[0]?.count);
              
              // 列出表中的所有数据
              if (dataCount[0]?.count > 0) {
                const allData = await store.query(`
                  SELECT key, LEFT(value, 50) as value_preview 
                  FROM public.${TEST_TABLE} 
                  ORDER BY key 
                  LIMIT 10
                `);
                
                console.log('📊 Sample data in table:');
                allData.forEach((row: any) => {
                  console.log(`  - ${row.key}: ${row.value_preview}${row.value.length > 50 ? '...' : ''}`);
                });
              }
              
            } else {
              console.log('❌ Target table does not exist:', TEST_TABLE);
              
              // 检查是否有其他相似的表
              const similarTables = tableExists.filter((row: any) => 
                row.table_name.toLowerCase().includes('keyv') || 
                row.table_name.toLowerCase().includes('cache')
              );
              
              if (similarTables.length > 0) {
                console.log('🔍 Similar tables found:');
                similarTables.forEach((row: any) => {
                  console.log(`  - ${row.table_schema}.${row.table_name}`);
                });
              }
            }
            
          } catch (dbError) {
            console.error('❌ Database query error:', dbError);
          }
        } else {
          console.log('❌ No store available');
        }
        
      } else {
        console.log('❌ Basic operations failed');
        console.log('  Set result:', setResult);
        console.log('  Get result:', getValue);
      }
      
    } catch (error) {
      console.error('❌ Test error:', error);
    }
  });
});