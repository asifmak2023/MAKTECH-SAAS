const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";

function pick(source: string): string {
  return source[Math.floor(Math.random() * source.length)];
}

export function generateStrongPassword(length = 12): string {
  const size = Math.min(12, Math.max(8, length));
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const pool = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [...required];
  while (chars.length < size) {
    chars.push(pick(pool));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
