const sanitizePhone = (value: unknown): string => {
    if (typeof value !== 'string') {
        return ''
    }

    const trimmed = value.trim()
    const hasPlus = trimmed.startsWith('+')
    const digits = trimmed.replace(/\D/g, '').slice(0, 15)

    return hasPlus ? `+${digits}` : digits
}

export default sanitizePhone
