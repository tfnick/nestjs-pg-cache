/**
 * 缓存参数名提取结果
 */
const paramNamesCache = new WeakMap<Function, string[]>();

/**
 * 提取函数参数名
 * @param func 目标函数
 */
function getParamNames(func: Function): string[] {
  if (paramNamesCache.has(func)) {
    return paramNamesCache.get(func)!;
  }

  const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
  const fnStr = func.toString().replace(STRIP_COMMENTS, '');
  const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'));

  if (!result.trim()) {
    paramNamesCache.set(func, []);
    return [];
  }

  const names = result.split(',').map(param => {
    // 处理默认值和解构，这里简单取等号前的部分并去空格
    // 对于更复杂的解构暂不支持完美提取，建议使用简单的参数名
    return param.split('=')[0].trim();
  });

  paramNamesCache.set(func, names);
  return names;
}

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

  // 1. 提取参数名列表
  const paramNames = getParamNames(method);

  // 检查模板中是否包含参数占位符
  const paramRegex = /\{([A-Za-z0-9_-]+)\}/g;
  let match;
  let resultKey = cacheKey;

  // 替换所有参数占位符
  while ((match = paramRegex.exec(cacheKey)) !== null) {
    const placeholder = match[1];
    let paramIndex: number;

    // 判断是数字索引还是参数名
    if (/^\d+$/.test(placeholder)) {
      paramIndex = parseInt(placeholder, 10);
    } else {
      paramIndex = paramNames.indexOf(placeholder);
    }

    // 检查参数索引是否有效
    if (paramIndex < 0 || paramIndex >= args.length) {
      console.warn(`paramsKeyFormat: Invalid parameter placeholder "${placeholder}" (index: ${paramIndex}), available args: [${paramNames.join(', ')}]`);
      return null;
    }

    const paramValue = args[paramIndex];

    // 如果参数是对象，将其转换为 JSON 字符串
    const paramString = typeof paramValue === 'object'
      ? JSON.stringify(paramValue)
      : String(paramValue);

    resultKey = resultKey.replace(match[0], paramString);
  }

  console.log(`paramsKeyFormat: Generated key "${resultKey}" from template "${cacheKey}" with args: ${JSON.stringify(args)}`);
  return resultKey;
}
