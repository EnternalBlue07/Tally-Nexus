/**
 * Canonical JSON Serializer for Cryptographic Signing & Hashing.
 * Guarantees deterministic serialization by recursively sorting object keys
 * and eliminating non-deterministic whitespace.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeJson(item));
    return `[${items.join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    const val = canonicalizeJson(obj[key]);
    return `${JSON.stringify(key)}:${val}`;
  });

  return `{${pairs.join(',')}}`;
}
