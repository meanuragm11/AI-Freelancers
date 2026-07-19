/**
 * UUID validation helpers for finance entity references.
 *
 * Future integration: validators before repository inserts.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function assertUuid(value: unknown, field = 'id'): string {
  if (!isValidUuid(value)) {
    throw new Error(`${field} must be a valid UUID`);
  }
  return value;
}

/** Returns the value when valid UUID, otherwise null (for optional FK fields). */
export function optionalUuid(value: unknown): string | null {
  return isValidUuid(value) ? value : null;
}
