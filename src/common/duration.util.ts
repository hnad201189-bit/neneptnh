// Parser nhỏ cho chuỗi thời hạn kiểu "15m" / "7d" / "3600s" — đủ dùng cho cookie maxAge,
// tránh phải thêm một gói npm chỉ để làm việc này.
const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function durationToMs(input: string, fallbackMs: number): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input.trim());
  if (!match) return fallbackMs;
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
}
