import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import UnauthorizedError from '../errors/unauthorized-error'

const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const CSRF_HEADER_NAME = 'x-csrf-token'

const getCookieOptions = () => ({
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
})

export const issueCsrfToken = (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    const csrfToken = crypto.randomBytes(32).toString('hex')

    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions())
    res.locals.csrfToken = csrfToken

    next()
}

export const verifyCsrfToken = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME]
    const csrfHeader = req.headers[CSRF_HEADER_NAME] as string | undefined

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return next(new UnauthorizedError('CSRF token invalid or missing'))
    }

    return next()
}

export const verifyOrigin = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const allowedOrigin = process.env.FRONTEND_URL
    const { origin } = req.headers

    if (allowedOrigin && origin && origin !== allowedOrigin) {
        return next(new UnauthorizedError('Invalid origin'))
    }

    return next()
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME }
