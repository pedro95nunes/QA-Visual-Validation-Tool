const SECRET_KEY_PATTERN =
  /(token|secret|password|passwd|authorization|auth|credential|api[_-]?key|access[_-]?key|bearer|cookie|session)/i;
const REDACTED = "***";

/** Returns true when a metadata key is likely to carry a secret value. */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/** Masks the value of a single key when the key name looks sensitive. */
export function redactValue(key: string, value: string): string {
  return isSecretKey(key) ? REDACTED : value;
}

/** Returns a copy of a string map with every sensitive value masked. */
export function redactMetadata(metadata: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    safe[key] = redactValue(key, value);
  }
  return safe;
}
