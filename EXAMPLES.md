# 基于 Keyv 的缓存注解使用示例

## 基本使用

### 1. 导入模块

#### 方式一：静态配置
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
      global: true,
    }),
  ],
})
export class AppModule {}
```

#### 方式二：动态配置（推荐）
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PgCacheModule } from 'nestjs-pg-cache';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PgCacheModule.forRootAsync({
      global: true,
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('db.postgres.host', 'localhost');
        const port = config.get<number>('db.postgres.port', 5432);
        const username = config.get<string>('db.postgres.username', 'postgres');
        const password = config.get<string>('db.postgres.password', 'postgres');
        const database = config.get<string>('db.postgres.database', 'nest-admin');

        const uri = `postgresql://${username}:${password}@${host}:${port}/${database}`;

        return {
          cache: {
            uri,
            ttl: 3600000, // 1小时
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

#### 方式三：简化配置格式
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PgCacheModule } from 'nestjs-pg-cache';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PgCacheModule.forRootAsync({
      global: true,
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('db.postgres.host', 'localhost');
        const port = config.get<number>('db.postgres.port', 5432);
        const username = config.get<string>('db.postgres.username', 'postgres');
        const password = config.get<string>('db.postgres.password', 'postgres');
        const database = config.get<string>('db.postgres.database', 'nest-admin');

        const uri = `postgresql://${username}:${password}@${host}:${port}/${database}`;

        // 直接返回PgCacheOptions
        return {
          uri,
          ttl: 3600000,
          table: 'app_cache', // 自定义表名
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. 在服务类中使用注解

```typescript
import { Injectable } from '@nestjs/common';
import { Cacheable, CacheEvict, CachePut } from 'nestjs-pg-cache';

@Injectable()
export class UserService {
  
  // 缓存查询结果 - 使用参数占位符
  @Cacheable('user:', 'user:{{0}}', 300000) // 缓存5分钟
  async getUserById(id: string) {
    // 模拟数据库查询
    return { id, name: `User ${id}`, createdAt: new Date() };
  }

  // 更新用户信息并清除相关缓存
  @CacheEvict('user:', 'user:{{0}}')
  async updateUser(id: string, data: any) {
    // 更新用户信息
    console.log(`Updating user ${id} with data:`, data);
    return { id, ...data, updatedAt: new Date() };
  }

  // 创建用户并更新缓存
  @CachePut('user:', 'user:{{0}}')
  async createUser(data: any) {
    const id = Math.random().toString(36).substr(2, 9);
    console.log(`Creating user ${id} with data:`, data);
    return { id, ...data, createdAt: new Date() };
  }
}
```

## 高级用法

### 1. 条件缓存

```typescript
import { Injectable } from '@nestjs/common';
import { CacheConditional } from 'nestjs-pg-cache';

@Injectable()
export class ProductService {
  
  // 只有当产品价格大于100时才缓存
  @CacheConditional(
    'product:', 
    'product:{{0}}',
    (result, args) => result.price > 100, // 条件函数
    600000 // 10分钟
  )
  async getProduct(id: string) {
    // 模拟数据库查询
    const price = Math.random() * 200;
    return { id, name: `Product ${id}`, price };
  }

  // 缓存用户产品列表，但排除空结果
  @CacheConditional(
    'user_products:', 
    'user_products:{{0}}',
    (result, args) => result.length > 0, // 只有非空列表才缓存
    300000
  )
  async getUserProducts(userId: string) {
    // 模拟数据库查询
    const count = Math.floor(Math.random() * 5);
    return Array(count).fill(0).map((_, i) => ({
      id: `product_${i}`,
      name: `Product ${i}`,
      userId
    }));
  }
}
```

### 2. 复杂的参数格式化

```typescript
import { Injectable } from '@nestjs/common';
import { Cacheable, CacheEvict } from 'nestjs-pg-cache';

@Injectable()
export class OrderService {
  
  // 使用多个参数构建缓存键
  @Cacheable('order:', 'order:{{0}}:{{1}}:{{2}}', 900000) // 15分钟
  async getOrders(userId: string, status: string, page: number) {
    console.log(`Fetching orders for user ${userId}, status ${status}, page ${page}`);
    return {
      userId,
      status,
      page,
      orders: Array(10).fill(0).map((_, i) => ({
        id: `order_${i}`,
        amount: Math.random() * 1000
      }))
    };
  }

  // 清除特定用户的所有订单缓存
  @CacheEvict('order:', 'order:{{0}}:*')
  async clearUserOrderCache(userId: string) {
    console.log(`Clearing all order caches for user ${userId}`);
    // 注意：通配符删除功能有限，需要扩展实现
    return true;
  }

  // 使用对象参数
  @Cacheable('search:', 'search:{{0}}', 300000)
  async searchProducts(filters: any) {
    // 对象参数会自动序列化为 JSON
    console.log('Searching with filters:', filters);
    return {
      filters,
      results: Array(5).fill(0).map((_, i) => ({
        id: `result_${i}`,
        name: `Search Result ${i}`,
        score: Math.random()
      }))
    };
  }
}
```

### 3. 组合使用多个注解

```typescript
import { Injectable } from '@nestjs/common';
import { Cacheable, CacheEvict } from 'nestjs-pg-cache';

@Injectable()
export class CacheDemoService {
  
  private dataStore = new Map();

  // 基础缓存
  @Cacheable('demo:', 'demo:data:{{0}}', 60000)
  async getData(key: string) {
    console.log(`Cache miss for key: ${key}`);
    if (!this.dataStore.has(key)) {
      this.dataStore.set(key, `Data for ${key} - ${new Date().toISOString()}`);
    }
    return this.dataStore.get(key);
  }

  // 更新数据并清除缓存
  @CacheEvict('demo:', 'demo:data:{{0}}')
  async updateData(key: string, value: string) {
    console.log(`Updating data for key: ${key}`);
    this.dataStore.set(key, value);
    return { key, value, updatedAt: new Date() };
  }

  // 清除所有相关缓存
  @CacheEvict('demo:', '*')
  async clearAllCache() {
    console.log('Clearing all demo cache');
    this.dataStore.clear();
    return { cleared: true, timestamp: new Date() };
  }
}
```

## 测试示例

### 创建测试服务

```typescript
import { Injectable } from '@nestjs/common';
import { Cacheable, CacheEvict } from 'nestjs-pg-cache';

@Injectable()
export class TestCacheService {
  private callCount = 0;

  @Cacheable('test:', 'test:counter:{{0}}', 30000)
  async getCachedCounter(id: string) {
    this.callCount++;
    return {
      id,
      value: this.callCount,
      timestamp: new Date().toISOString()
    };
  }

  @CacheEvict('test:', 'test:counter:{{0}}')
  async resetCounter(id: string) {
    this.callCount = 0;
    return { id, reset: true };
  }

  getCallCount() {
    return this.callCount;
  }
}
```

### 在控制器中使用

```typescript
import { Controller, Get, Param, Post } from '@nestjs/common';
import { TestCacheService } from './test-cache.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestCacheService) {}

  @Get('counter/:id')
  async getCounter(@Param('id') id: string) {
    return await this.testService.getCachedCounter(id);
  }

  @Post('counter/:id/reset')
  async resetCounter(@Param('id') id: string) {
    return await this.testService.resetCounter(id);
  }

  @Get('stats')
  getStats() {
    return {
      callCount: this.testService.getCallCount()
    };
  }
}
```

## 参数占位符说明

参数占位符使用 `{{数字}}` 格式，数字表示参数的索引（从0开始）：

- `{{0}}` - 第一个参数
- `{{1}}` - 第二个参数  
- `{{2}}` - 第三个参数
- 以此类推

示例：
```typescript
// 方法签名: getUser(id: string, includeDetails: boolean)
@Cacheable('user:', 'user:{{0}}:details:{{1}}', 300000)
async getUser(id: string, includeDetails: boolean) {
  // 缓存键将为: user:123:details:true
}
```

## 注意事项

1. **通配符支持有限**：由于 keyv 的限制，通配符删除功能需要额外实现
2. **参数序列化**：对象参数会自动序列化为 JSON 字符串
3. **错误处理**：缓存操作失败时不会影响主业务流程
4. **性能考虑**：对于高频操作，建议合理设置缓存过期时间

这些示例展示了如何基于 keyv 实现类似 Redis 的缓存注解功能，同时保持了与原始代码相似的 API 设计。