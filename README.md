# NestJS PostgreSQL Cache Module

基于 @keyv/postgres 的 NestJS 缓存模块，提供简单易用的 PostgreSQL 缓存解决方案。

## 特性

- ✅ 基于 @keyv/postgres 实现
- ✅ 支持同步和异步配置
- ✅ 全局缓存支持
- ✅ 注解式缓存方法结果（@Cacheable, @CacheEvict, @CachePut, @CacheConditional）
- ✅ 支持动态参数占位符（如 `{{0}}`, `{{1}}`）
- ✅ 灵活的缓存配置
- ✅ Redis 兼容的 API 方法
- ✅ 支持无日志表（useUnloggedTable）
- ✅ 完整的错误处理和日志记录
- ✅ TypeScript 支持

## 安装

```bash
npm install nestjs-pg-cache @keyv/postgres
```

## 快速开始

### 基本使用

1. 导入模块

```typescript
import { Module } from '@nestjs/common';
import { PgCacheModule } from 'nestjs-pg-cache';

@Module({
  imports: [
    PgCacheModule.forRoot({
      cache: {
        uri: 'postgresql://username:password@localhost:5432/database',
        ttl: 3600000, // 1小时
      },
      global: true, // 全局模块
    }),
  ],
})
export class AppModule {}
```

2. 在服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { PgCacheService } from 'nestjs-pg-cache';

@Injectable()
export class UserService {
  constructor(private readonly cacheService: PgCacheService) {}

  async getUser(id: string) {
    // 尝试从缓存获取
    const cachedUser = await this.cacheService.get(`user:${id}`);
    if (cachedUser) {
      return cachedUser;
    }

    // 从数据库获取
    const user = await this.findUserFromDatabase(id);
    
    // 设置缓存
    await this.cacheService.set(`user:${id}`, user, 300000); // 5分钟
    
    return user;
  }
}
```

### 异步配置

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PgCacheModule } from 'nestjs-pg-cache';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PgCacheModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        cache: {
          uri: configService.get('DATABASE_URL'),
          ttl: configService.get('CACHE_TTL', 3600000),
          table: 'app_cache',
          useUnloggedTable: configService.get('CACHE_USE_UNLOGGED_TABLE', false),
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
  ],
})
export class AppModule {}
```

### 使用注解式缓存

```typescript
import { Injectable } from '@nestjs/common';
import { Cacheable, CacheEvict, CachePut, CacheConditional } from 'nestjs-pg-cache';

@Injectable()
export class ProductService {
  
  @Cacheable('products', 'products:all', 60000) // 缓存1分钟
  async getAllProducts() {
    return await this.productRepository.find();
  }

  @Cacheable('products', 'products:{{0}}', 300000) // 动态key，缓存5分钟
  async getProduct(id: string) {
    return await this.productRepository.findOne(id);
  }

  @CacheEvict('products', 'products:all') // 删除指定缓存
  async createProduct(product: Product) {
    return await this.productRepository.save(product);
  }

  @CachePut('products', 'products:{{0}}', 300000) // 更新缓存
  async updateProduct(id: string, product: Product) {
    return await this.productRepository.update(id, product);
  }

  @CacheConditional('products', 'products:{{0}}', (result) => result !== null, 300000)
  async getProductIfAvailable(id: string) {
    const product = await this.productRepository.findOne(id);
    return product || null;
  }
}
```

## 键名行为说明

### Keyv Namespace 机制

Keyv 使用 namespace 机制来避免键名冲突，理解这一点非常重要：

#### 默认行为
```typescript
// 不设置 namespace
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    // namespace 默认为 'keyv'
  }
});

await cacheService.set('user:123', userData);
// 实际存储的键: 'keyv:user:123'
```

#### 自定义 Namespace
```typescript
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    namespace: 'myapp:'  // 实际存储: 'myapp:keyv:user:123'
  }
});

await cacheService.set('user:123', userData);
// 实际存储的键: 'myapp:keyv:user:123'
```

#### 禁用 Namespace
```typescript
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    namespace: ''  // 实际存储: 'user:123'
  }
});

await cacheService.set('user:123', userData);
// 实际存储的键: 'user:123'
```

### 实际存储键名规则

最终存储在数据库中的键名格式为：`{namespace}{keyv_default}{user_key}`

| namespace 设置 | 最终存储键名（传入 'user:123'） |
|---------------|----------------------------|
| 未设置 | `keyv:user:123` |
| `namespace: 'app:'` | `app:keyv:user:123` |
| `namespace: ''` | `user:123` |
| `namespace: 'cache:'` | `cache:keyv:user:123` |

### 键名最佳实践

```typescript
// 推荐: 明确设置 namespace
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    namespace: 'myapp:',  // 明确前缀
  }
});

// 推荐: 在业务层考虑 namespace
export const CACHE_KEYS = {
  // 考虑了 namespace 的键名设计
  USER: (id: string) => `user:${id}`,      // 实际: myapp:keyv:user:123
  CONFIG: () => `config:global`,          // 实际: myapp:keyv:config:global
  SESSION: (token: string) => `sess:${token}`, // 实际: myapp:keyv:sess:abc123
};
```

## 客户端 API 参考

### PgCacheService - 核心方法

#### 基本 CRUD 操作

```typescript
// 设置缓存
await cacheService.set('user:123', { name: 'John', age: 30 }, 300000);
// 返回: 'OK' | null

// 获取缓存
const user = await cacheService.get('user:123');
// 返回: { name: 'John', age: 30 } | null

// 删除缓存
const deleted = await cacheService.del('user:123');
// 返回: 1 (删除的键数量)

// 清空所有缓存
const cleared = await cacheService.reset();
// 返回: 1
```

> **注意**: 类型保持机制
> - 字符串 `"67"` 会保持为字符串 `"67"`，不会变成数值 `67`
> - 数值 `67` 会保持为数值 `67`
> - 对象和数组会正确序列化/反序列化
> - 保持了原始数据类型的完整性

#### 批量操作

```typescript
// 批量设置
const keys = ['key1', 'key2', 'key3'];
const values = ['value1', 'value2', 'value3'];

for (let i = 0; i < keys.length; i++) {
  await cacheService.set(keys[i], values[i]);
}

// 批量获取
const results = await cacheService.mget(['key1', 'key2', 'key3']);
// 返回: ['value1', 'value2', 'value3']

// 批量删除
const deletedCount = await cacheService.del(['key1', 'key2', 'key3']);
// 返回: 3
```

#### Redis 兼容方法

```typescript
// 检查键是否存在
const exists = await cacheService.exists('user:123');
// 返回: 0 (不存在) 或 1 (存在)

// 仅在键不存在时设置
const setResult = await cacheService.setnx('user:123', 'value');
// 返回: 1 (设置成功) 或 0 (键已存在)

// 获取字符串长度
const length = await cacheService.strlen('user:123');
// 返回: 数字
```

### 哈希操作 (使用复合键模拟)

```typescript
// 设置哈希字段
await cacheService.hset('product:123', 'name', 'Laptop');
await cacheService.hset('product:123', 'price', '999');

// 获取哈希字段
const name = await cacheService.hget('product:123', 'name');
// 返回: 'Laptop'

// 批量设置哈希字段
await cacheService.hmset('product:123', {
  name: 'Laptop',
  price: 999,
  category: 'Electronics'
});

// 检查哈希字段是否存在
const exists = await cacheService.hexists('product:123', 'name');
// 返回: 0 或 1

// 删除哈希字段
const deleted = await cacheService.hdel('product:123', ['name', 'price']);
// 返回: 删除的字段数量
```

### 向后兼容方法

```typescript
// 获取值 (向后兼容)
const value = await cacheService.getValue('user:123');
// 返回: any | undefined

// 设置值 (向后兼容)
const success = await cacheService.setValue('user:123', userData, 300000);
// 返回: boolean

// 删除键 (向后兼容)
const deleted = await cacheService.deleteKey('user:123');
// 返回: boolean

// 检查键是否存在
const hasKey = await cacheService.hasKey('user:123');
// 返回: boolean

// 获取多个值
const values = await cacheService.getMultiple(['key1', 'key2']);
// 返回: (any | undefined)[]

// 清空缓存
await cacheService.clearCache();
```

### 调试和监控

```typescript
// 获取缓存统计信息
const stats = await cacheService.getStats();
// 返回: { size?: number, hitCount?: number, missCount?: number }

// 获取 Keyv 客户端实例
const keyvClient = cacheService.getClient();
// 可以直接访问底层 Keyv API

// 获取 Redis 风格信息
const info = await cacheService.getInfo();
// 返回: 模拟的 Redis INFO 信息
```

## 配置选项

### PgCacheModuleOptions

| 选项 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| global | boolean | 是否全局模块 | false |
| cache | PgCacheOptions | 缓存配置 | - |

### PgCacheOptions

| 选项 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| uri | string | PostgreSQL 连接字符串 | process.env.DATABASE_URL |
| table | string | 缓存表名 | 'keyv_cache' |
| namespace | string | 键名前缀，默认为 'keyv' | 'keyv' |
| ttl | number | 默认过期时间（毫秒） | 3600000 (1小时) |
| compression | boolean | 是否压缩 | false |
| useUnloggedTable | boolean | 是否使用无日志表 | false |
| serialize | Function | 序列化函数 | JSON.stringify |
| deserialize | Function | 反序列化函数 | JSON.parse |
| store | PostgresStore | 自定义存储实例 | - |

### useUnloggedTable 选项说明

- **`useUnloggedTable: false`** (默认): 使用普通 PostgreSQL 表
  - ✅ 数据持久化，支持事务恢复
  - ✅ 数据库崩溃时数据安全
  - ❌ 写入速度相对较慢

- **`useUnloggedTable: true`**: 使用无日志表
  - ✅ 写入速度更快（适合高频缓存操作）
  - ✅ 减少磁盘 I/O
  - ❌ 数据库崩溃时缓存数据会丢失
  - ❌ 不支持事务回滚

## 高级用法

### 环境变量配置

```bash
# .env
DATABASE_URL=postgresql://username:password@localhost:5432/cache_db
CACHE_TTL=3600000
CACHE_TABLE=app_cache
CACHE_USE_UNLOGGED_TABLE=false
```

```typescript
PgCacheModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    cache: {
      uri: configService.get('DATABASE_URL'),
      ttl: +configService.get('CACHE_TTL', 3600000),
      table: configService.get('CACHE_TABLE'),
      useUnloggedTable: configService.get('CACHE_USE_UNLOGGED_TABLE') === 'true',
    },
  }),
  inject: [ConfigService],
})
```

### 自定义序列化

```typescript
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    serialize: (data: any) => {
      // 自定义序列化逻辑
      return JSON.stringify(data, null, 2);
    },
    deserialize: (data: string) => {
      // 自定义反序列化逻辑
      return JSON.parse(data);
    },
  },
})
```

### 自定义存储实例

```typescript
import PostgresStore from '@keyv/postgres';

const store = new PostgresStore({
  uri: 'postgresql://...',
  table: 'custom_cache',
  useUnloggedTable: true,
});

PgCacheModule.forRoot({
  cache: {
    store,
    ttl: 7200000, // 2小时
  },
})
```

### 错误处理和日志

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  async getUser(id: string) {
    try {
      const cached = await this.cacheService.get(`user:${id}`);
      if (cached) {
        this.logger.log(`Cache hit for user ${id}`);
        return cached;
      }

      this.logger.log(`Cache miss for user ${id}, fetching from database`);
      const user = await this.userService.findById(id);
      
      await this.cacheService.set(`user:${id}`, user, 300000);
      return user;
    } catch (error) {
      this.logger.error(`Cache operation failed for user ${id}`, error);
      // 降级到直接数据库查询
      return await this.userService.findById(id);
    }
  }
}
```

### 缓存键命名策略

⚠️ **重要提示**: Keyv 默认会为所有键添加 `keyv:` 前缀作为 namespace。如果你设置 `namespace: 'myapp:'`，那么实际存储的键会是 `myapp:keyv:yourkey`。

```typescript
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_LIST: 'users:all',
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_LIST: 'products:all',
  SESSION: (token: string) => `session:${token}`,
  RATE_LIMIT: (ip: string) => `rate_limit:${ip}`,
};

// 方式1: 使用默认 namespace (实际存储为 keyv:user:123)
@Injectable()
export class UserService {
  async getUser(id: string) {
    const cacheKey = CACHE_KEYS.USER(id);
    return await this.cacheService.get(cacheKey);
  }
}

// 方式2: 自定义 namespace (实际存储为 myapp:user:123)
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    namespace: 'myapp:', // 实际存储为 myapp:keyv:user:123
  }
});

// 方式3: 禁用 namespace (实际存储为 user:123)
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    namespace: '', // 空字符串禁用前缀
  }
});
```

## 开发

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 运行特定测试
npm run test:service
npm run test:mock

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 测试覆盖

测试包括以下场景：
- ✅ 基本的 set/get 操作
- ✅ 对象序列化/反序列化
- ✅ 批量操作
- ✅ Redis 兼容方法
- ✅ useUnloggedTable 选项
- ✅ 注解式缓存
- ✅ 错误处理
- ✅ 异步配置

## 许可证

MIT