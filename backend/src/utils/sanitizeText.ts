const sanitizeText = (value?: unknown): unknown => {
    if (typeof value !== 'string') {
        return value
    }

    return value
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .trim()
}

export default sanitizeText
