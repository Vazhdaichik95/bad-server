const sanitizePhone = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .replace(/[^\d+()\- ]/g, '')
    .trim()
    .slice(0, 20)
}

export default sanitizePhone
