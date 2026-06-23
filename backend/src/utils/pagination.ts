export const normalizePage = (value: unknown, defaultValue = 1): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue
  }
  return Math.trunc(parsed)
}

export const normalizeLimit = (
  value: unknown,
  defaultValue = 10,
  max = 10
): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue
  }
  return Math.min(Math.trunc(parsed), max)
}
