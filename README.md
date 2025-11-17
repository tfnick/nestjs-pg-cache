# NestJS PostgreSQL Cache Module

基于 @keyv/postgres 的 NestJS 缓存模块，提供简单易用的 PostgreSQL 缓存解决方案。

## 特性

- ✅ 基于 @keyv/postgres 实现
- ✅ 支持同步和异步配置
- ✅ 全局缓存支持
- ✅ 装饰器方式缓存方法结果
- ✅ 灵活的缓存配置
- ✅ 错误处理和日志记录
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
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
  ],
})
export class AppModule {}
```

### 使用装饰器

```typescript
import { Injectable, UseInterceptors } from '@nestjs/common';
import { CacheConfig, CacheInterceptor } from 'nestjs-pg-cache';

@Injectable()
export class ProductService {
  
  @CacheConfig('products:all', 60000) // 缓存1分钟
  @UseInterceptors(CacheInterceptor)
  async getAllProducts() {
    return await this.productRepository.find();
  }

  @CacheConfig('products:{{id}}', 300000) // 动态key，缓存5分钟
  @UseInterceptors(CacheInterceptor)
  async getProduct(id: string) {
    return await this.productRepository.findOne(id);
  }
}
```

## API 文档

### PgCacheService

#### get<T>(key: string): Promise<T | undefined>
获取缓存值

#### set<T>(key: string, value: T, ttl?: number): Promise<boolean>
设置缓存值

#### delete(key: string): Promise<boolean>
删除缓存值

#### clear(): Promise<void>
清空所有缓存

#### has(key: string): Promise<boolean>
检查缓存是否存在

#### mget<T>(keys: string[]): Promise<(T | undefined)[]>
批量获取缓存值

#### mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean[]>
批量设置缓存值

#### mdelete(keys: string[]): Promise<boolean[]>
批量删除缓存值

### 装饰器

#### @CacheKey(key: string)
设置缓存键

#### @CacheTTL(ttl: number)
设置缓存过期时间（毫秒）

#### @CacheConfig(key: string, ttl?: number)
组合装饰器，设置缓存键和过期时间

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
| table | string | 缓存表名 | 'keyv' |
| namespace | string | 键名前缀 | 'keyv:' |
| ttl | number | 默认过期时间（毫秒） | 3600000 |
| compression | boolean | 是否压缩 | false |
| serialize | Function | 序列化函数 | JSON.stringify |
| deserialize | Function | 反序列化函数 | JSON.parse |
| store | PostgresStore | 自定义存储实例 | - |

## 高级用法

### 自定义序列化

```typescript
PgCacheModule.forRoot({
  cache: {
    uri: 'postgresql://...',
    serialize: (data) => {
      // 自定义序列化逻辑
      return JSON.stringify(data);
    },
    deserialize: (data) => {
      // 自定义反序列化逻辑
      return JSON.parse(data);
    },
  },
})
```

### 自定义存储实例

```typescript
import { PostgresStore } from '@keyv/postgres';

const store = new PostgresStore({
  uri: 'postgresql://...',
  table: 'custom_cache',
});

PgCacheModule.forRoot({
  cache: {
    store,
  },
})
```

## 开发

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化代码
npm run format
```

## 许可证

MIT