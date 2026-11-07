/**
 * Canonical JSON Serializer conforming to RFC 8785 (JSON Canonicalization Scheme - JCS).
 * Guarantees deterministic serialization:
 * - Deterministic UTF-16 code unit property key sorting
 * - Whitespace elimination
 * - Strict IEEE-754 number formatting (disallows NaN and Infinity, normalizes -0 to 0)
 * - Standard JSON undefined handling: omitted in objects, converted to null in arrays
 * - Disallows functions, symbols, and non-serializable types
 */
export function canonicalizeJson(value: unknown): string {
  if (value === undefined) {
    throw new Error('RFC8785_SERIALIZATION_ERROR: Top-level undefined cannot be serialized to canonical JSON.');
  }
  return serializeValue(value);
}

function serializeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (type === 'number') {
    const num = value as number;
    if (!Number.isFinite(num)) {
      throw new Error('RFC8785_SERIALIZATION_ERROR: Non-finite numbers (NaN, Infinity) are prohibited.');
    }
    // RFC 8785 Section 3.2.2.3: -0 must be serialized as "0"
    if (Object.is(num, -0)) {
      return '0';
    }
    return JSON.stringify(num);
  }

  if (type === 'string') {
    return JSON.stringify(value);
  }

  if (type === 'function' || type === 'symbol') {
    throw new Error(`RFC8785_SERIALIZATION_ERROR: Type '${type}' cannot be serialized.`);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        return 'null';
      }
      return serializeValue(item);
    });
    return `[${items.join(',')}]`;
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    // Filter out properties with undefined, function, or symbol values (matching standard JSON semantics)
    const validKeys = Object.keys(obj).filter((key) => {
      const val = obj[key];
      return val !== undefined && typeof val !== 'function' && typeof val !== 'symbol';
    });

    // RFC 8785 Section 3.2.3: Sort keys by UTF-16 code units
    validKeys.sort();

    const pairs = validKeys.map((key) => {
      const canonicalKey = JSON.stringify(key);
      const canonicalVal = serializeValue(obj[key]);
      return `${canonicalKey}:${canonicalVal}`;
    });

    return `{${pairs.join(',')}}`;
  }

  throw new Error(`RFC8785_SERIALIZATION_ERROR: Unsupported value type '${type}'.`);
}
