export const parseOutputValue = (raw: string): any => {
  if (!raw) return "";
  const trimmed = raw.trim();

  // Try parsing direct JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // If direct JSON parse fails, try sanitizing Python-style quotes & booleans
    try {
      const sanitized = trimmed
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bNone\b/g, "null");
      return JSON.parse(sanitized);
    } catch {
      return trimmed;
    }
  }
};

export const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (
        !Object.prototype.hasOwnProperty.call(b, key) ||
        !isDeepEqual(a[key], b[key])
      ) {
        return false;
      }
    }
    return true;
  }

  if (typeof a === "string" && typeof b === "string") {
    return a.trim().replace(/\s+/g, " ") === b.trim().replace(/\s+/g, " ");
  }

  return false;
};

export const normalizeOutput = (raw: string): string => {
  const val = parseOutputValue(raw);
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return String(val).trim().replace(/\s+/g, " ");
};
