# Cacheable 装饰器调试指南

## 可能的问题及解决方案

### 1. 依赖注入问题
**问题**: CacheService 没有正确注入到使用装饰器的类中。

**解决方案**: 确保在模块中正确导入和配置了 PgCacheModule：
```typescript
@Module({
  imports: [
    PgCacheModule.forRoot({
      cache: {
        uri: 'postgresql://user:password@localhost:5432/database'
      }
    })
  ],
  providers: [YourService]
})
export class YourModule {}
```

### 2. 装饰器使用问题
**问题**: 装饰器参数格式不正确。

**正确用法示例**:
```typescript
@Injectable()
export class UserService {
  // 基础用法 - 使用第一个参数作为键
  @Cacheable('user:', 'info:{{0}}', 60000) // 1分钟缓存
  async getUserInfo(id: string): Promise<User> {
    return await this.userRepository.findById(id);
  }

  // 使用多个参数作为键
  @Cacheable('user:', 'profile:{{0}}-{{1}}', 300000) // 5分钟缓存
  async getUserProfile(userId: string, profileType: string): Promise<Profile> {
    return await this.profileRepository.findByUserIdAndType(userId, profileType);
  }

  // 对象参数会被自动序列化
  @Cacheable('user:', 'search:{{0}}', 120000) // 2分钟缓存
  async searchUsers(criteria: SearchCriteria): Promise<User[]> {
    return await this.userRepository.search(criteria);
  }
}
```

### 3. 缓存键格式问题
**问题**: `paramsKeyFormat` 返回 null。

**常见原因**:
- 参数索引超出范围
- 缓存键模板为空
- 参数值格式化失败

**调试步骤**:
1. 查看控制台日志（已添加详细日志）
2. 检查参数数量和索引是否匹配
3. 确认缓存键模板格式正确

### 4. 缓存命中判断问题
**修复**: 现在使用 `cacheResult !== null && cacheResult !== undefined` 双重检查。

## 调试步骤

### 1. 启用详细日志
装饰器已添加详细的日志输出，包括：
- 缓存服务可用性检查
- 键格式化结果
- 缓存命中/未命中状态
- 错误处理信息

### 2. 检查控制台输出
正常运行时应该看到类似日志：
```
paramsKeyFormat: Generated key "info:123" from template "info:{{0}}" with 1 args
Cacheable: Cache miss for key user:info:123, executing original method
Cacheable: Cached result for key user:info:123
```

### 3. 验证缓存存储
```typescript
// 手动验证缓存
const cacheService = moduleRef.get<PgCacheService>(PgCacheService);
const cachedUser = await cacheService.get('user:info:123');
console.log('Cached user:', cachedUser);
```

## 常见问题排查

### 问题1: 装饰器完全不生效
**检查项**:
1. 确保 PgCacheModule 已正确导入
2. 确保服务已注入到使用的类中
3. 检查装饰器语法是否正确

### 问题2: 缓存总是未命中
**检查项**:
1. 查看键生成日志，确认键格式正确
2. 检查缓存服务是否正常连接
3. 验证数据是否正确存储

### 问题3: 缓存结果不正确
**检查项**:
1. 检查序列化/反序列化是否正确
2. 确认缓存过期时间设置
3. 查看是否有其他地方修改了缓存数据

## 性能优化建议

### 1. 合理设置缓存时间
- 频繁更新的数据：较短缓存时间（1-5分钟）
- 相对稳定的数据：较长缓存时间（30分钟-2小时）
- 静态数据：很长缓存时间（数小时到数天）

### 2. 选择合适的缓存键
- 键名要唯一且有描述性
- 避免使用过长的键名
- 使用命名空间避免键冲突

### 3. 监控缓存效果
```typescript
// 添加缓存统计
const cacheStats = await cacheService.getStats();
console.log('Cache statistics:', cacheStats);
```