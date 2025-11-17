# NestJS PgCache 测试用例

本目录包含了 NestJS PgCache 模块的完整测试套件。

## 测试文件说明

### 1. `pg-cache.service.spec.ts`
- **功能**: 测试 PgCacheService 的核心功能
- **包含测试**:
  - 模块初始化
  - 基础缓存操作（set/get/del/mget）
  - Redis 兼容方法
  - 向后兼容方法
  - 错误处理

### 2. `decorators.spec.ts`
- **功能**: 测试缓存装饰器的集成功能
- **包含测试**:
  - `@Cacheable` 装饰器
  - `@CacheEvict` 装饰器
  - `@CachePut` 装饰器
  - `@CacheConditional` 装饰器
  - 装饰器错误处理

### 3. `pg-cache.module.spec.ts`
- **功能**: 测试 PgCacheModule 的配置和初始化
- **包含测试**:
  - `forRoot` 方法
  - `forRootAsync` 方法
  - 依赖注入配置
  - 错误处理

## 运行测试

### 前置条件

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **准备测试数据库**:
   - 确保 PostgreSQL 服务正在运行
   - 创建测试数据库（可选）
   - 设置环境变量 `TEST_DATABASE_URL`

   ```bash
   # 设置测试数据库连接字符串
   export TEST_DATABASE_URL="postgresql://username:password@localhost:5432/test_cache"
   ```

### 运行命令

1. **运行所有测试**:
   ```bash
   npm test
   ```

2. **运行特定测试文件**:
   ```bash
   npm test -- test/pg-cache.service.spec.ts
   npm test -- test/decorators.spec.ts
   npm test -- test/pg-cache.module.spec.ts
   ```

3. **运行测试并生成覆盖率报告**:
   ```bash
   npm run test:cov
   ```

4. **监听模式运行测试**:
   ```bash
   npm run test:watch
   ```

5. **详细模式运行测试**（显示所有日志）:
   ```bash
   VERBOSE_TESTS=true npm test
   ```

## 测试配置

### 环境变量

- `TEST_DATABASE_URL`: 测试数据库连接字符串
- `NODE_ENV`: 自动设置为 `test`
- `VERBOSE_TESTS`: 设置为 `true` 显示详细日志

### Jest 配置

测试配置文件位于 `test/jest.config.js`，包含：
- TypeScript 支持
- 覆盖率收集
- 超时设置（30秒）
- 模块路径映射

## 测试数据库

### 默认配置
- 默认连接: `postgresql://test:test@localhost:5432/test_cache`
- 超时时间: 30秒
- 自动清理: 每个测试后自动清空缓存表

### 表结构
测试会自动创建和使用以下表：
- `test_cache_table`
- `test_module_cache`
- `async_factory_cache`
- `inject_factory_cache`
- `promise_config_cache`
- `nested_config_cache`
- `instance1_cache`
- `instance2_cache`

## 故障排除

### 常见问题

1. **连接数据库失败**:
   - 检查 PostgreSQL 服务是否运行
   - 验证连接字符串是否正确
   - 确认数据库权限

2. **测试超时**:
   - 增加 `testTimeout` 配置
   - 检查网络延迟
   - 优化测试数据库性能

3. **端口冲突**:
   - 确保数据库端口正确（通常 5432）
   - 检查是否有其他进程占用端口

### 调试技巧

1. **启用详细日志**:
   ```bash
   VERBOSE_TESTS=true npm test
   ```

2. **运行单个测试**:
   ```bash
   npm test -- --testNamePattern="应该缓存方法结果"
   ```

3. **查看数据库状态**:
   ```sql
   -- 查看测试表
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE '%test%';
   
   -- 查看缓存数据
   SELECT * FROM test_cache_table LIMIT 10;
   ```

## 持续集成

测试配置适用于 CI/CD 环境：
- 自动设置测试环境
- 并行执行测试
- 生成覆盖率报告
- 支持矩阵测试（多个数据库版本）

## 贡献指南

添加新测试时请遵循：
1. 使用 `describe` 组织相关测试
2. 为每个测试编写清晰的描述
3. 清理测试数据和连接
4. 包含错误情况测试
5. 保持测试独立性