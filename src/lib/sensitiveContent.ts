export const SENSITIVE_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+]{16,}/i,
  /AKIA[0-9A-Z]{16}/,
  /gh[ps]_[A-Za-z0-9_]{36,}/,
  /xox[bpras]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/,
  /(?:password|passwd|pwd)\s*[:=]\s*['"]?.{4,}/i,
  /(?:secret|client[_-]?secret)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+]{8,}/i,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /sk-ant-[A-Za-z0-9_-]{20,}/,
];

export function containsSensitiveData(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}
