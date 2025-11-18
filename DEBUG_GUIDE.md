# 调试断点不起作用问题排查指南

## 常见原因和解决方案

### 1. 源码映射 (Source Maps) 问题

#### 问题分析
如果你的业务项目使用 TypeScript 编译，而 `node_modules` 中的包是编译后的 JavaScript 代码，IDE 可能无法正确映射到原始源码。

#### 解决方案

**方案 A: 启用源码映射**
```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true,
    "sourceRoot": "./"
  }
}
```

**方案 B: 使用 `yarn link` 或 `npm link`**
```bash
# 在你的项目根目录
cd d:/code/study/nestjs-pg-cache
npm link

# 在业务项目目录
cd path/to/your/business/project
npm link @tfnick/nestjs-pg-cache
```

**方案 C: 使用 `patch-package`**
```bash
npm install patch-package --save-dev
# 修改 node_modules 中的代码
# 然后运行
npx patch-package @tfnick/nestjs-pg-cache
```

### 2. 调试器配置问题

#### VS Code 配置
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/nest",
      "args": ["start", "--debug", "--watch"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "node",
      "runtimeArgs": ["--inspect-brk"]
    },
    {
      "name": "Debug Current File",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/main.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "runtimeArgs": ["--inspect-brk"]
    }
  ]
}
```

#### WebStorm/IntelliJ 配置
1. 打开 Run/Debug Configurations
2. 添加新的 Node.js 配置
3. 设置:
   - Node parameters: `--inspect-brk`
   - JavaScript file: `dist/main.js`
   - Environment variables: `NODE_ENV=development`

### 3. TypeScript 编译选项问题

#### 确保正确的编译配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "sourceMap": true,          // 关键：启用源码映射
    "inlineSources": true,        // 关键：内联源码
    "declaration": true,          // 生成声明文件
    "declarationMap": true        // 声明文件的映射
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 4. 包的发布方式问题

#### 问题分析
如果包发布时没有包含源码和源码映射，调试器就无法正确映射。

#### 解决方案：修改包的发布配置

**package.json 配置**
```json
{
  "files": [
    "dist/**/*",
    "src/**/*",           // 包含源码
    "*.ts",              // 包含根目录 TS 文件
    "README.md"
  ],
  "scripts": {
    "prepublishOnly": "npm run build",
    "build": "tsc --sourceMap --inlineSources --declaration --declarationMap"
  }
}
```

**tsconfig.build.json**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true,
    "declaration": true,
    "declarationMap": true
  },
  "exclude": ["test/**/*"]
}
```

### 5. 运行时调试技巧

#### 方案 A: 使用 console.log
临时在关键位置添加日志：
```typescript
// 在 pg-cache.service.ts 中
console.log('DEBUG: set called with key:', key, 'value:', val);
console.trace('Call stack:', new Error().stack);
```

#### 方案 B: 使用 Node.js 调试器
```bash
# 启动调试模式
node --inspect-brk dist/main.js

# 然后在 Chrome 中打开 chrome://inspect
```

#### 方案 C: 使用 VS Code 调试
```bash
# 安装 VS Code 扩展
# - Debugger for Chrome
# - TypeScript Importer
```

### 6. 针对当前项目的具体解决方案

#### 为 nestjs-pg-cache 启用调试

**步骤 1: 修改构建配置**
```json
// package.json
{
  "scripts": {
    "build": "tsc --sourceMap --inlineSources",
    "build:watch": "tsc --watch --sourceMap --inlineSources",
    "debug": "npm run build && node --inspect-brk dist/index.js"
  }
}
```

**步骤 2: 重新构建包**
```bash
cd d:/code/study/nestjs-pg-cache
npm run build
```

**步骤 3: 在业务项目中重新链接**
```bash
cd path/to/business/project
rm -rf node_modules/@tfnick/nestjs-pg-cache
npm install
```

**步骤 4: VS Code 调试配置**
```json
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Debug Business App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/nest",
      "args": ["start", "--watch"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development",
        "SOURCE_MAP_SUPPORT": "true"
      },
      "runtimeArgs": ["--inspect"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### 7. 验证调试是否工作

#### 创建测试文件
```typescript
// debug-test.ts
console.log('Debug test file loaded');

export function debugTest() {
  console.log('Debug test function called');
  debugger; // 在这里设置断点
  return 'test';
}
```

#### 在业务代码中测试
```typescript
import { debugTest } from './debug-test';

// 在你的业务代码中调用
const result = debugTest();
```

### 8. 常用调试命令

```bash
# 检查包是否包含源码
ls -la node_modules/@tfnick/nestjs-pg-cache/dist/
ls -la node_modules/@tfnick/nestjs-pg-cache/src/

# 检查是否有 source map
find node_modules/@tfnick/nestjs-pg-cache -name "*.js.map"

# 重新安装依赖
npm uninstall @tfnick/nestjs-pg-cache
npm install @tfnick/nestjs-pg-cache

# 使用本地开发版本
cd path/to/nestjs-pg-cache
npm run build
cd path/to/business/project
npm install d:/code/study/nestjs-pg-cache
```

## 推荐的最佳实践

### 1. 开发时使用 npm link
```bash
# 在包目录
cd d:/code/study/nestjs-pg-cache
npm link

# 在业务目录
cd path/to/business/project  
npm link @tfnick/nestjs-pg-cache
```

### 2. 确保包发布包含源码
```json
// package.json
{
  "files": ["dist/**/*", "src/**/*"],
  "scripts": {
    "prepublishOnly": "npm run build"
  }
}
```

### 3. 使用 VS Code 的调试配置
```json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/nest",
  "args": ["start"],
  "env": {
    "NODE_ENV": "development"
  },
  "console": "integratedTerminal",
  "sourceMaps": true,
  "runtimeArgs": ["--inspect"]
}
```

这样应该能解决你在 node_modules 中断点不起作用的问题！