import 'reflect-metadata';

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 默认测试数据库配置（如果没有设置环境变量）
if (!process.env.TEST_DATABASE_URL) {
  console.warn('TEST_DATABASE_URL not set, using default test database configuration');
  process.env.TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_cache';
}

// 全局测试超时设置
jest.setTimeout(30000);

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// 控制台日志过滤（减少测试时的噪音）
if (process.env.NODE_ENV === 'test') {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  
  console.log = (...args: any[]) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsoleLog(...args);
    }
  };
  
  console.warn = (...args: any[]) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsoleWarn(...args);
    }
  };
  
  // 保留错误日志
  console.error = (...args: any[]) => {
    originalConsoleLog(...args);
  };
}