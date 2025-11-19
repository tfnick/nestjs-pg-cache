/**
 * 格式化参数作为缓存键
 * @param method 方法引用
 * @param cacheKey 缓存键模板
 * @param args 方法参数
 * @returns 格式化后的缓存键
 */
export function paramsKeyFormat(
  method: Function,
  cacheKey: string,
  args: any[]
): string | null {
  // 如果缓存键为空，返回 null
  if (!cacheKey) {
    console.warn('paramsKeyFormat: cacheKey is null or empty');
    return null;
  }

  // 检查模板中是否包含参数占位符
  const paramRegex = /\{([A-Za-z0-9_-]+)\}/g;
  let match;
  let resultKey = cacheKey;

  // 替换所有参数占位符
  while ((match = paramRegex.exec(cacheKey)) !== null) {
    const paramIndex = parseInt(match[1], 10);
    
    // 检查参数索引是否有效
    if (paramIndex < 0 || paramIndex >= args.length) {
      console.warn(`paramsKeyFormat: Invalid parameter index ${paramIndex}, available args length: ${args.length}`);
      return null;
    }

    const paramValue = args[paramIndex];
    
    // 如果参数是对象，将其转换为 JSON 字符串
    const paramString = typeof paramValue === 'object' 
      ? JSON.stringify(paramValue) 
      : String(paramValue);

    resultKey = resultKey.replace(match[0], paramString);
  }

  console.log(`paramsKeyFormat: Generated key "${resultKey}" from template "${cacheKey}" with ${args.length} args`);
  return resultKey;
}