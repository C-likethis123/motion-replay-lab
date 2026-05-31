export function parseNumberInput(value: string): number | null {
  const num = Number(value);

  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }

  return num;
}
