/**
 * Context for evaluating when clauses
 */
export interface WhenContext {
  /** Active editor ID */
  activeEditor?: string;
  /** Active view ID */
  activeView?: string;
  /** Currently focused element type */
  focusedElement?: string;
  /** Whether in read-only mode */
  isReadOnly?: boolean;
  /** Whether there's an active selection */
  hasSelection?: boolean;
  /** Resource scheme (file, http, etc.) */
  resourceScheme?: string;
  /** Resource language ID */
  resourceLangId?: string;
  /** Resource file extension */
  resourceExtname?: string;
  /** Platform (win32, darwin, linux) */
  platform?: string;
  /** Whether running in development mode */
  isDevelopment?: boolean;
  /** Custom context values from plugins */
  custom?: Record<string, unknown>;
}

/**
 * Evaluate a when clause against a context
 */
export function evaluateWhenClause(
  when: string | undefined,
  context: WhenContext
): boolean {
  if (!when || when.trim() === '') {
    return true;
  }

  try {
    return parseAndEvaluate(when, context);
  } catch (error) {
    console.error(`Failed to evaluate when clause: ${when}`, error);
    return false;
  }
}

/**
 * Parse and evaluate a when clause expression
 */
function parseAndEvaluate(expr: string, context: WhenContext): boolean {
  // Handle OR expressions
  if (expr.includes('||')) {
    const parts = splitTopLevel(expr, '||');
    return parts.some((part) => parseAndEvaluate(part.trim(), context));
  }

  // Handle AND expressions
  if (expr.includes('&&')) {
    const parts = splitTopLevel(expr, '&&');
    return parts.every((part) => parseAndEvaluate(part.trim(), context));
  }

  // Handle NOT expressions
  if (expr.startsWith('!')) {
    return !parseAndEvaluate(expr.slice(1).trim(), context);
  }

  // Handle parentheses
  if (expr.startsWith('(') && expr.endsWith(')')) {
    return parseAndEvaluate(expr.slice(1, -1).trim(), context);
  }

  // Handle comparison expressions
  const comparisonMatch = expr.match(/^(.+?)\s*(==|!=|=~|!~)\s*(.+)$/);
  if (comparisonMatch) {
    const [, left, op, right] = comparisonMatch;
    const leftValue = resolveValue(left.trim(), context);
    const rightValue = resolveValue(right.trim(), context);

    switch (op) {
      case '==':
        return leftValue === rightValue;
      case '!=':
        return leftValue !== rightValue;
      case '=~':
        // Regex match
        if (typeof rightValue === 'string' && typeof leftValue === 'string') {
          const regex = new RegExp(rightValue.replace(/^\/|\/$/g, ''));
          return regex.test(leftValue);
        }
        return false;
      case '!~':
        // Regex not match
        if (typeof rightValue === 'string' && typeof leftValue === 'string') {
          const regex = new RegExp(rightValue.replace(/^\/|\/$/g, ''));
          return !regex.test(leftValue);
        }
        return true;
    }
  }

  // Handle in expression (value in set)
  const inMatch = expr.match(/^(.+?)\s+in\s+'(.+)'$/);
  if (inMatch) {
    const [, key, list] = inMatch;
    const value = resolveValue(key.trim(), context);
    const items = list.split(',').map((s) => s.trim());
    return items.includes(String(value));
  }

  // Handle simple key existence/truthiness
  const value = resolveValue(expr, context);
  return Boolean(value);
}

/**
 * Split an expression at the top level (respecting parentheses)
 */
function splitTopLevel(expr: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (depth === 0 && expr.slice(i, i + delimiter.length) === delimiter) {
      parts.push(current);
      current = '';
      i += delimiter.length - 1;
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Resolve a value from the context
 */
function resolveValue(key: string, context: WhenContext): unknown {
  // Handle string literals
  if ((key.startsWith("'") && key.endsWith("'")) ||
      (key.startsWith('"') && key.endsWith('"'))) {
    return key.slice(1, -1);
  }

  // Handle boolean literals
  if (key === 'true') return true;
  if (key === 'false') return false;

  // Handle number literals
  if (/^\d+$/.test(key)) {
    return parseInt(key, 10);
  }

  // Handle context keys
  switch (key) {
    case 'activeEditor':
      return context.activeEditor;
    case 'activeView':
      return context.activeView;
    case 'focusedElement':
      return context.focusedElement;
    case 'isReadOnly':
      return context.isReadOnly;
    case 'hasSelection':
      return context.hasSelection;
    case 'resourceScheme':
      return context.resourceScheme;
    case 'resourceLangId':
      return context.resourceLangId;
    case 'resourceExtname':
      return context.resourceExtname;
    case 'platform':
      return context.platform;
    case 'isDevelopment':
      return context.isDevelopment;
    default:
      // Check custom context
      return context.custom?.[key];
  }
}

/**
 * Create a when context from the current environment
 */
export function createWhenContext(overrides?: Partial<WhenContext>): WhenContext {
  const platform = typeof navigator !== 'undefined'
    ? navigator.platform.toLowerCase().includes('mac')
      ? 'darwin'
      : navigator.platform.toLowerCase().includes('win')
        ? 'win32'
        : 'linux'
    : 'linux';

  return {
    platform,
    isDevelopment: process.env.NODE_ENV === 'development',
    ...overrides,
  };
}
