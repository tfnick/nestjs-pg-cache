# 快速修复：node_modules 断点不起作用

## 立即解决方案

### 方案 1: 使用 npm link（推荐）

```bash
# 1. 在你的包目录执行
cd d:/code/study/nestjs-pg-cache
npm run build  # 重新生成带源码映射的版本
npm link

# 2. 在业务项目目录执行
cd path/to/your/business/project
npm link @tfnick/nestjs-pg-cache

# 3. 重启你的业务项目和调试器
```

### 方案 2: 修改本地 node_modules

```bash
# 1. 构建带源码映射的版本
cd d:/code/study/nestjs-pg-cache
npm run build

# 2. 复制到业务项目的 node_modules
cd path/to/your/business/project
rm -rf node_modules/@tfnick/nestjs-pg-cache
cp -r d:/code/study/nestjs-pg-cache/dist node_modules/@tfnick/nestjs-pg-cache
cp -r d:/code/study/nestjs-pg-cache/src node_modules/@tfnick/nestjs-pg-cache

# 3. 重启调试
```

### 方案 3: 使用 patch-package（持久化修复）

```bash
# 1. 在业务项目安装 patch-package
cd path/to/your/business/project
npm install patch-package --save-dev

# 2. 修改 node_modules 中的文件
# 直接在 node_modules/@tfnick/nestjs-pg-cache/dist/services/pg-cache.service.js
# 添加你想要的调试代码或断点

# 3. 生成补丁
npx patch-package @tfnick/nestjs-pg-cache

# 4. 在 package.json 中添加
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

## 验证修复是否生效

### 测试源码映射

```typescript
// 在你的业务代码中测试
import { PgCacheService } from '@tfnick/nestjs-pg-cache';

// 现在在 VS Code 中应该能正确跳转到源码
const cacheService = new PgCacheService({ /* 配置 */ });
```

### VS Code 调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS with Source Maps",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/nest",
      "args": ["start", "--watch"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development",
        "SOURCE_MAP_SUPPORT": "true"
      },
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["--inspect"],
      "resolveSourceMapLocations": [
        "${workspaceFolder}/**",
        "!**/node_modules/**"
      ]
    }
  ]
}
```

## 如果还不行，试试这些

### 1. 检查是否是缓存问题

```bash
# 清理所有缓存
cd path/to/your/business/project
rm -rf node_modules/.cache
rm -rf dist
rm -rf node_modules/.bin/nest
npm install
npm run build
```

### 2. 使用 console.log 调试（临时方案）

在关键的 PgCacheService 方法中添加调试代码：

```typescript
// 临时修改 node_modules/@tfnick/nestjs-pg-cache/dist/services/pg-cache.service.js
async set(key: string, val: any, ttl?: number): Promise<'OK' | null> {
  console.log('🔥 DEBUG: PgCacheService.set called');
  console.log('🔥 DEBUG: key:', key);
  console.log('🔥 DEBUG: val:', val);
  console.log('🔥 DEBUG: ttl:', ttl);
  console.log('🔥 DEBUG: call stack:', new Error().stack);
  
  // 原来的代码...
}
```

### 3. 环境变量调试

```bash
# 设置这些环境变量
export NODE_ENV=development
export SOURCE_MAP_SUPPORT=true
export V8_DEOPT_OPTIONS=true

# 然后启动
npm run start:debug
```

## 为什么之前断点不起作用？

1. **源码映射缺失**: 包发布时没有包含 TypeScript 源码和 .map 文件
2. **编译配置**: tsconfig.json 没有 `sourceMap: true` 和 `inlineSources: true`
3. **调试器配置**: IDE 没有正确配置源码映射支持
4. **包发布方式**: npm 包只发布了编译后的 JS 文件

## 现在已经修复的内容

✅ tsconfig.json 添加了源码映射配置
✅ package.json 的 build 脚本包含了源码映射
✅ package.json 包含了源码文件在 files 中
✅ 生成的 JS 文件包含 `//# sourceMappingURL=`

现在使用 `npm link` 应该能让断点正常工作了！