const sanitizeText = (value?: unknown): string => {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .trim()
}

export default sanitizeText
