import { Test, TestingModule } from '@nestjs/testing';
import { PgCacheModule, PgCacheService } from '../src';

describe('PgCacheModule Integration Tests', () => {
  let module: TestingModule;
  let service: PgCacheService;

  // 测试数据库配置
  const testDbConfig = {
    cache: {
      uri: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache',
      table: 'test_module_cache',
      ttl: 120000 // 2分钟
    }
  };

  afterEach(async () => {
    if (service) {
      await service.reset();
    }
    if (module) {
      await module.close();
    }
  });

  describe('forRoot 方法', () => {
    it('应该使用配置参数初始化模块', async () => {
      module = await Test.createTestingModule({
        imports: [PgCacheModule.forRoot(testDbConfig)]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();

      // 测试基本功能
      await service.set('module:test', 'module test value');
      const result = await service.get('module:test');
      expect(result).toBe('module test value');
    });

    it('应该使用默认配置当不提供参数时', async () => {
      // 设置环境变量作为默认配置
      const originalDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = testDbConfig.cache.uri;

      module = await Test.createTestingModule({
        imports: [PgCacheModule.forRoot()]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();

      // 恢复原始环境变量
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    });

    it('应该支持全局模块配置', async () => {
      module = await Test.createTestingModule({
        imports: [PgCacheModule.forRoot({ ...testDbConfig, global: true })]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();
    });
  });

  describe('forRootAsync 方法', () => {
    it('应该支持 useFactory 配置方式', async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRootAsync({
            useFactory: () => ({
              // 直接返回 PgCacheOptions 格式的配置
              uri: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache',
              table: 'async_factory_cache',
              ttl: 120000
            })
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();

      await service.set('async:test', 'async test value');
      const result = await service.get('async:test');
      expect(result).toBe('async test value');
    });

    it('应该支持依赖注入的配置方式', async () => {
      // 模拟配置服务
      const mockConfigService = {
        get: (key: string) => {
          switch (key) {
            case 'DATABASE_URL':
              return process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache';
            case 'CACHE_TTL':
              return 300000;
            default:
              return undefined;
          }
        }
      };

      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRootAsync({
            useFactory: (config: any) => ({
              cache: {
                uri: config.get('DATABASE_URL'),
                table: 'inject_factory_cache',
                ttl: config.get('CACHE_TTL')
              }
            }),
            inject: ['MOCK_CONFIG_SERVICE'],
            global: false
          })
        ],
        providers: [
          {
            provide: 'MOCK_CONFIG_SERVICE',
            useValue: mockConfigService
          }
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();
    });

    it('应该支持直接返回 PgCacheOptions 的配置', async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRootAsync({
            useFactory: () => {
              // 模拟异步配置加载
              return Promise.resolve({
                uri: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache',
                table: 'promise_config_cache',
                ttl: 180000
              });
            }
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();

      await service.set('promise:test', 'promise test value');
      const result = await service.get('promise:test');
      expect(result).toBe('promise test value');
    });

    it('应该支持从其他服务获取配置', async () => {
      const mockDependency = {
        getDatabaseConfig: () => ({
          uri: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache',
          table: 'inject_config_cache',
          ttl: 240000
        })
      };

      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRootAsync({
            useFactory: (dependency: any) => ({
              cache: dependency.getDatabaseConfig()
            }),
            inject: ['MOCK_DEPENDENCY']
          })
        ],
        providers: [
          {
            provide: 'MOCK_DEPENDENCY',
            useValue: mockDependency
          }
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的数据库连接', async () => {
      // 这个测试会尝试连接到无效的数据库，应该抛出错误
      await expect(
        Test.createTestingModule({
          imports: [
            PgCacheModule.forRoot({
              cache: {
                uri: 'postgresql://invalid:invalid@localhost:9999/invalid_db'
              }
            })
          ]
        }).compile()
      ).rejects.toThrow();
    });

    it('应该处理缺少环境变量的情况', async () => {
      // 清除环境变量
      const originalDbUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // 这个测试应该失败，因为既没有配置也没有环境变量
      const testModule = await Test.createTestingModule({
        imports: [PgCacheModule.forRoot()]
      }).compile();

      // 模块应该能创建，但使用缓存时会失败
      const testService = testModule.get<PgCacheService>(PgCacheService);

      await testModule.close();

      // 恢复原始环境变量
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      }
    });

    it('应该处理异步配置错误', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            PgCacheModule.forRootAsync({
              useFactory: () => {
                throw new Error('Configuration error');
              }
            })
          ]
        }).compile()
      ).rejects.toThrow('Configuration error');
    });
  });

  describe('模块集成测试', () => {
    it('应该正确处理嵌套配置', async () => {
      module = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRootAsync({
            useFactory: () => ({
              // 测试嵌套配置格式
              cache: {
                uri: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_cache',
                table: 'nested_config_cache',
                ttl: 150000,
                namespace: 'test_namespace'
              },
              global: false
            })
          })
        ]
      }).compile();

      service = module.get<PgCacheService>(PgCacheService);

      expect(service).toBeDefined();

      // 测试命名空间是否生效
      await service.set('nested:test', 'nested test value');
      const result = await service.get('nested:test');
      expect(result).toBe('nested test value');
    });

    it('应该支持多次初始化不同的模块实例', async () => {
      const module1 = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              ...testDbConfig.cache,
              table: 'instance1_cache'
            }
          })
        ]
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [
          PgCacheModule.forRoot({
            cache: {
              ...testDbConfig.cache,
              table: 'instance2_cache'
            }
          })
        ]
      }).compile();

      const service1 = module1.get<PgCacheService>(PgCacheService);
      const service2 = module2.get<PgCacheService>(PgCacheService);

      // 两个服务应该独立工作
      await service1.set('instance', 'value1');
      await service2.set('instance', 'value2');

      expect(await service1.get('instance')).toBe('value1');
      expect(await service2.get('instance')).toBe('value2');

      await module1.close();
      await module2.close();
    });
  });
});